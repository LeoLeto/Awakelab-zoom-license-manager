import cron from 'node-cron';
import { assignmentService } from '../services/assignment.service';
import { settingsService } from '../services/settings.service';
import { licenseService } from '../services/license.service';
import { zoomService } from '../services/zoom.service';

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
              password: newPassword,
              passwordEmail: newPassword // Also update passwordEmail if needed
            },
            'system-cron'
          );
          
          rotatedCount++;
          console.log(`   ✅ Rotated password for license: ${license.email}`);
          
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

  console.log('✅ Cron jobs initialized (expired assignments + password rotation)');
};

