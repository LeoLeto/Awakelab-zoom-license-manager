import cron from 'node-cron';
import { assignmentService } from '../services/assignment.service';

/**
 * Schedule cron job to mark expired assignments
 * Runs every day at 1:00 AM
 */
export const initCronJobs = () => {
  // Mark expired assignments daily at 1:00 AM
  cron.schedule('0 1 * * *', async () => {
    try {
      console.log('🕐 Running cron job: Mark expired assignments');
      const count = await assignmentService.markExpiredAssignments();
      console.log(`✅ Marked ${count} expired assignments`);
    } catch (error) {
      console.error('❌ Error in cron job (mark expired assignments):', error);
    }
  });

  console.log('✅ Cron jobs initialized');
};
