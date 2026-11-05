import cron from 'node-cron';
import { Assignment, IAssignment } from '../models/Assignment.model';
import { License, ILicense } from '../models/License.model';
import { assignmentService } from '../services/assignment.service';
import { settingsService } from '../services/settings.service';
import { licenseService } from '../services/license.service';
import zoomService from '../services/zoom.service';
import { emailService, LicenseCredentials } from '../services/email.service';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Dates are stored on UTC day boundaries — format them in UTC too */
const formatDay = (d: Date) => new Date(d).toLocaleDateString('es-CL', { timeZone: 'UTC' });

/**
 * Key that groups assignments into a single email: same person, same period,
 * same type of use.
 */
const groupKey = (a: IAssignment) =>
  [
    a.correocorporativo.trim().toLowerCase(),
    new Date(a.fechaInicioUso).toISOString().slice(0, 10),
    new Date(a.fechaFinUso).toISOString().slice(0, 10),
    a.tipoUso,
  ].join('|');

/**
 * Schedule cron job to mark expired assignments and rotate passwords
 * Runs every day at 1:00 AM
 */
export const initCronJobs = () => {
  // Mark expired assignments and rotate passwords daily at 1:00 AM
  cron.schedule('0 1 * * *', async () => {
    try {
      console.log('🕐 Running cron job: Mark expired assignments & rotate passwords');

      // Step 1: Mark expired assignments (frees their licenses)
      const { count: expiredCount, freedLicenseIds } = await assignmentService.markExpiredAssignments();
      console.log(`✅ Marked ${expiredCount} expired assignments, freed ${freedLicenseIds.length} license(s)`);

      // Step 2: Check if auto password rotation is enabled
      const autoRotationEnabled = await settingsService.isAutoPasswordRotationEnabled();

      if (!autoRotationEnabled) {
        console.log('ℹ️  Auto password rotation is disabled');
        return;
      }

      console.log('🔐 Starting automatic password rotation for expired licenses...');

      // Step 3: Rotate exactly the licenses freed in this run, so the previous
      // user loses access when the assignment ends. Re-check that each one is
      // still free and has no active assignment before touching it.
      const freedLicenses = await License.find({ _id: { $in: freedLicenseIds }, estado: 'libre' });

      let rotatedCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      // Check if password change notifications are enabled
      const notifyOnPasswordChange = await settingsService.getSetting('notifyOnPasswordChange');
      const adminEmails = notifyOnPasswordChange ? await emailService.getAdminNotificationEmails() : [];

      // Step 4: Rotate passwords for freed licenses
      for (const license of freedLicenses) {
        try {
          const stillAssigned = await Assignment.exists({ licenseId: license._id, estado: 'activo' });
          if (stillAssigned) {
            skippedCount++;
            continue;
          }

          // Generate new password
          const newPassword = zoomService.generateSecurePassword();

          // Change password in Zoom
          await zoomService.changeUserPassword(license.email, newPassword);

          // Update password in database
          await licenseService.updateLicense(
            license._id.toString(),
            {
              passwordZoom: newPassword,
              passwordEmail: newPassword,
            },
            'system-cron'
          );

          rotatedCount++;
          console.log(`   ✅ Rotated password for license: ${license.email}`);

          // Send individual notification if enabled
          for (const adminEmail of adminEmails) {
            await emailService.sendPasswordChanged(
              {
                licenseEmail: license.email,
                newPassword,
                reason: 'Rotación automática - Licencia disponible',
              },
              adminEmail
            );
          }

          // Add delay between API calls to avoid rate limiting
          await sleep(1000);
        } catch (error: any) {
          failedCount++;
          console.error(`   ❌ Failed to rotate password for ${license.email}:`, error.message);
        }
      }

      console.log(`\n📊 Password Rotation Summary:`);
      console.log(`   Licenses freed in this run: ${freedLicenseIds.length}`);
      console.log(`   Successfully rotated: ${rotatedCount}`);
      console.log(`   Skipped (assigned again): ${skippedCount}`);
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
      const warningDays = Number(await settingsService.getSetting('expirationWarningDays')) || 2;

      // End dates are stored as 23:59:59.999Z of their last day: warn about the
      // assignments whose last day (UTC) is exactly `warningDays` from today.
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      dayStart.setUTCDate(dayStart.getUTCDate() + warningDays);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const expiring = await Assignment.find({
        estado: 'activo',
        licenseId: { $ne: null },
        fechaFinUso: { $gte: dayStart, $lte: dayEnd },
      }).populate('licenseId');

      // Skip assignments that already have an extension approved or requested
      const withoutExtension: IAssignment[] = [];
      for (const assignment of expiring) {
        const extended = await Assignment.exists({
          originalAssignmentId: assignment._id,
          estado: { $in: ['activo', 'pendiente'] },
        });
        if (!extended) withoutExtension.push(assignment);
      }

      // One warning per person and end date, listing every license
      const groups = new Map<string, IAssignment[]>();
      for (const assignment of withoutExtension) {
        const key = `${assignment.correocorporativo.trim().toLowerCase()}|${dayStart.toISOString().slice(0, 10)}`;
        groups.set(key, [...(groups.get(key) || []), assignment]);
      }

      console.log(
        `📧 Found ${expiring.length} assignments expiring in ${warningDays} days ` +
          `(${expiring.length - withoutExtension.length} already extended) → ${groups.size} email(s)`
      );

      let sentCount = 0;
      let failedCount = 0;

      // Send warning emails
      for (const group of groups.values()) {
        const first = group[0];
        try {
          const sent = await emailService.sendExpirationWarning({
            teacherName: first.nombreApellidos,
            teacherEmail: first.correocorporativo,
            licenseEmail: group
              .map((a) => (a.licenseId as unknown as ILicense)?.email)
              .filter(Boolean)
              .sort((x, y) => x.localeCompare(y, 'es', { numeric: true })),
            endDate: formatDay(first.fechaFinUso),
            daysRemaining: warningDays,
          });

          if (sent) {
            sentCount++;
            console.log(`   ✅ Sent warning to: ${first.correocorporativo} (${group.length} license(s))`);
          } else {
            failedCount++;
          }

          // Add small delay to avoid rate limiting
          await sleep(500);
        } catch (error: any) {
          failedCount++;
          console.error(`   ❌ Failed to send warning to ${first.correocorporativo}:`, error.message);
        }
      }

      console.log(`\n📊 Expiration Warning Summary:`);
      console.log(`   Assignments expiring in ${warningDays} days: ${withoutExtension.length}`);
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
  // generates a fresh password, and emails the teacher. Licenses of the same
  // person for the same period go out in ONE email.
  cron.schedule('0 7 * * *', async () => {
    try {
      console.log('🕐 Running cron job: Lock licenses & send credentials (48h before start)');

      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Find active assignments starting within 48h that still need credentials.
      // Extensions are excluded: they reuse the same license and credentials,
      // so their password must never be rotated.
      const pending = await Assignment.find({
        estado: 'activo',
        licenseId: { $ne: null },
        credentialsSent: { $ne: true },
        isExtension: { $ne: true },
        fechaInicioUso: { $lte: in48h },
      });

      console.log(`   Found ${pending.length} assignment(s) needing credentials`);

      let skippedCount = 0;
      let failedCount = 0;
      const ready = new Map<string, { assignments: IAssignment[]; credentials: LicenseCredentials[] }>();

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

          const key = groupKey(assignment);
          const group = ready.get(key) || { assignments: [], credentials: [] };
          group.assignments.push(assignment);
          group.credentials.push({
            licenseEmail: license.email,
            zoomPassword: freshPassword,
            hostKey: license.claveAnfitrionZoom,
            moodleUser: license.usuarioMoodle,
            moodlePassword: license.claveUsuarioMoodle,
          });
          ready.set(key, group);

          // Respect Zoom API rate limits
          await sleep(1000);
        } catch (error: any) {
          failedCount++;
          console.error(`   ❌ Failed for ${assignment.correocorporativo}:`, error.message);
        }
      }

      let sentCount = 0;
      for (const { assignments, credentials } of ready.values()) {
        const first = assignments[0];
        try {
          await emailService.sendMultiAssignmentConfirmation({
            teacherName: first.nombreApellidos,
            teacherEmail: first.correocorporativo,
            startDate: formatDay(first.fechaInicioUso),
            endDate: formatDay(first.fechaFinUso),
            platform: first.tipoUso,
            licenses: credentials.sort((a, b) =>
              a.licenseEmail.localeCompare(b.licenseEmail, 'es', { numeric: true })
            ),
          });
          sentCount += assignments.length;
          console.log(
            `   ✅ Credentials sent to ${first.correocorporativo} for ${credentials.length} license(s)`
          );
        } catch (error: any) {
          failedCount += assignments.length;
          console.error(`   ❌ Failed to email ${first.correocorporativo}:`, error.message);
        }

        // The passwords were rotated, so mark them as handled either way:
        // a failed email is visible in the email log and can be resent.
        await Assignment.updateMany(
          { _id: { $in: assignments.map((a) => a._id) } },
          { $set: { credentialsSent: true } }
        );
      }

      console.log(`\n📊 48h Credential Lock Summary:`);
      console.log(`   Pending assignments: ${pending.length}`);
      console.log(`   Credentials sent: ${sentCount} (in ${ready.size} email(s))`);
      console.log(`   Skipped (still occupied): ${skippedCount}`);
      console.log(`   Failed: ${failedCount}`);
    } catch (error) {
      console.error('❌ Error in 48h credential lock cron job:', error);
    }
  });
};
