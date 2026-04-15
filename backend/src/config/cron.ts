import cron from 'node-cron';
import { Assignment } from '../models/Assignment.model';
import { License } from '../models/License.model';
import { assignmentService } from '../services/assignment.service';
import { settingsService } from '../services/settings.service';
import { licenseService } from '../services/license.service';
import zoomService from '../services/zoom.service';
import { emailService } from '../services/email.service';

/**
 * Schedule cron job to mark expired assignments and rotate passwords
 * Runs every day at 1:00 AM
 */
export const initCronJobs = () => {
  // Mark expired assignments and rotate passwords daily at 1:00 AM
  cron.schedule('0 1 * * *', async () => {
    try {
      console.log('🕐 Running cron job: Mark expired assignments & rotate passwords');
      
      // Step 1: Mark expired assignments
      const expiredCount = await assignmentService.markExpiredAssignments();
      console.log(`✅ Marked ${expiredCount} expired assignments`);
      
      // Step 2: Check if auto password rotation is enabled
      const autoRotationEnabled = await settingsService.isAutoPasswordRotationEnabled();
      
      if (!autoRotationEnabled) {
        console.log('ℹ️  Auto password rotation is disabled');
        return;
      }
      
      console.log('🔐 Starting automatic password rotation for expired licenses...');
      
      // Step 3: Get all licenses that just became available (no active assignments)
      const allLicenses = await licenseService.getAllLicensesWithAssignments();
      const availableLicenses = allLicenses.filter(license => 
        license.status === 'libre' && 
        (!license.currentAssignment || license.currentAssignment.estado !== 'activo')
      );
      
      let rotatedCount = 0;
      let failedCount = 0;
      const rotatedLicenses: Array<{ email: string, password: string }> = [];
      
      // Check if password change notifications are enabled
      const notifyOnPasswordChange = await settingsService.getSetting('notifyOnPasswordChange');
      const adminEmails = await settingsService.getSetting('adminNotificationEmails');
      
      // Step 4: Rotate passwords for available licenses
      for (const license of availableLicenses) {
        try {
          // Generate new password
          const newPassword = zoomService.generateSecurePassword();
          
          // Change password in Zoom
          await zoomService.changeUserPassword(license.email, newPassword);
          
          // Update password in database
          await licenseService.updateLicense(
            license._id.toString(),
            { 
              passwordZoom: newPassword,
              passwordEmail: newPassword // Also update passwordEmail if needed
            },
            'system-cron'
          );
          
          rotatedCount++;
          rotatedLicenses.push({ email: license.email, password: newPassword });
          console.log(`   ✅ Rotated password for license: ${license.email}`);
          
          // Send individual notification if enabled
          if (notifyOnPasswordChange && adminEmails) {
            const emails = adminEmails.split(',').map((email: string) => email.trim());
            for (const adminEmail of emails) {
              await emailService.sendPasswordChanged(
                {
                  licenseEmail: license.email,
                  newPassword,
                  reason: 'Rotación automática - Licencia disponible'
                },
                adminEmail
              );
            }
          }
          
          // Add delay between API calls to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error: any) {
          failedCount++;
          console.error(`   ❌ Failed to rotate password for ${license.email}:`, error.message);
        }
      }
      
      console.log(`\n📊 Password Rotation Summary:`);
      console.log(`   Total available licenses: ${availableLicenses.length}`);
      console.log(`   Successfully rotated: ${rotatedCount}`);
      console.log(`   Failed: ${failedCount}`);
      
    } catch (error) {
      console.error('❌ Error in cron job:', error);
    }
  });

  // Check for expiring assignments and send warnings daily at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('🕐 Running cron job: Check expiring assignments');
      
      // Check if expiration notifications are enabled
      const notificationsEnabled = await settingsService.getSetting('notifyOnExpiration');
      if (!notificationsEnabled) {
        console.log('ℹ️  Expiration notifications are disabled');
        return;
      }
      
      // Get warning threshold
      const warningDays = await settingsService.getSetting('expirationWarningDays') || 2;
      
      // Calculate threshold date (today + warningDays)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thresholdDate = new Date(today);
      thresholdDate.setDate(thresholdDate.getDate() + warningDays);
      
      // Get all active assignments
      const allLicenses = await licenseService.getAllLicensesWithAssignments();
      const expiringAssignments = allLicenses
        .filter(license => {
          if (!license.currentAssignment || license.currentAssignment.estado !== 'activo') {
            return false;
          }
          
          const endDate = new Date(license.currentAssignment.fechaFin);
          endDate.setHours(0, 0, 0, 0);
          
          // Check if end date is within the warning threshold
          return endDate.getTime() === thresholdDate.getTime();
        })
        .map(license => ({
          license,
          assignment: license.currentAssignment!
        }));
      
      console.log(`📧 Found ${expiringAssignments.length} assignments expiring in ${warningDays} days`);
      
      let sentCount = 0;
      let failedCount = 0;
      
      // Send warning emails
      for (const { license, assignment } of expiringAssignments) {
        try {
          const endDate = new Date(assignment.fechaFin);
          
          await emailService.sendExpirationWarning({
            teacherName: assignment.nombreDocente,
            teacherEmail: assignment.emailDocente,
            licenseEmail: license.email,
            endDate: endDate.toLocaleDateString('es-CL'),
            daysRemaining: warningDays
          });
          
          sentCount++;
          console.log(`   ✅ Sent warning to: ${assignment.emailDocente}`);
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error: any) {
          failedCount++;
          console.error(`   ❌ Failed to send warning to ${assignment.emailDocente}:`, error.message);
        }
      }
      
      console.log(`\n📊 Expiration Warning Summary:`);
      console.log(`   Assignments expiring in ${warningDays} days: ${expiringAssignments.length}`);
      console.log(`   Warnings sent: ${sentCount}`);
      console.log(`   Failed: ${failedCount}`);
      
    } catch (error) {
      console.error('❌ Error in expiration warning cron job:', error);
    }
  });

  console.log('✅ Cron jobs initialized (expired assignments + password rotation + expiration warnings + 48h credential lock)');

  // ── Lock licenses & send credentials 48h before start ─────────────────────
  // Runs daily at 7:00 AM — finds assignments starting within the next 48 hours
  // whose credentials haven't been sent yet, locks the license to "ocupado",
  // generates a fresh password, and emails the teacher.
  cron.schedule('0 7 * * *', async () => {
    try {
      console.log('🕐 Running cron job: Lock licenses & send credentials (48h before start)');

      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Find active assignments starting within 48h that still need credentials
      const pending = await Assignment.find({
        estado: 'activo',
        licenseId: { $ne: null },
        credentialsSent: { $ne: true },
        fechaInicioUso: { $lte: in48h },
      });

      console.log(`   Found ${pending.length} assignment(s) needing credentials`);

      let sentCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      for (const assignment of pending) {
        try {
          const license = await License.findById(assignment.licenseId);
          if (!license) continue;

          // Only proceed if the license is currently libre —
          // if it's still occupied by another assignment, we'll retry next run
          if (license.estado !== 'libre') {
            skippedCount++;
            console.log(`   ⏳ Skipped ${license.email} — still occupied, will retry`);
            continue;
          }

          // Lock the license
          await License.findByIdAndUpdate(license._id, { $set: { estado: 'ocupado' } });

          // Generate fresh password
          const freshPassword = zoomService.generateSecurePassword();
          await zoomService.changeUserPassword(license.email, freshPassword);
          await licenseService.updatePasswordByEmail(license.email, freshPassword);

          // Send credentials email
          await emailService.sendAssignmentConfirmation({
            teacherName: assignment.nombreApellidos,
            teacherEmail: assignment.correocorporativo,
            licenseEmail: license.email,
            startDate: new Date(assignment.fechaInicioUso).toLocaleDateString('es-CL'),
            endDate: new Date(assignment.fechaFinUso).toLocaleDateString('es-CL'),
            platform: assignment.tipoUso,
            zoomPassword: freshPassword,
            hostKey: license.claveAnfitrionZoom,
            moodleUser: license.usuarioMoodle,
            moodlePassword: license.claveUsuarioMoodle,
          });

          // Mark credentials as sent
          await Assignment.findByIdAndUpdate(assignment._id, { $set: { credentialsSent: true } });

          sentCount++;
          console.log(`   ✅ License locked & credentials sent to ${assignment.correocorporativo} for ${license.email}`);

          // Respect Zoom API rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          failedCount++;
          console.error(`   ❌ Failed for ${assignment.correocorporativo}:`, error.message);
        }
      }

      console.log(`\n📊 48h Credential Lock Summary:`);
      console.log(`   Pending assignments: ${pending.length}`);
      console.log(`   Credentials sent: ${sentCount}`);
      console.log(`   Skipped (still occupied): ${skippedCount}`);
      console.log(`   Failed: ${failedCount}`);
    } catch (error) {
      console.error('❌ Error in 48h credential lock cron job:', error);
    }
  });
};

