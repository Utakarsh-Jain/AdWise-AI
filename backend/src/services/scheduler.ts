import prisma from '../db';
import { SocialSyncService } from './socialSync';

export class SchedulerService {
  private static checkIntervalMs = 6 * 60 * 60 * 1000; // 6 hours
  private static timer: NodeJS.Timeout | null = null;

  /**
   * Starts the background scheduler.
   */
  public static startScheduler() {
    if (this.timer) return;

    console.log('⏰ Initializing Social Synchronization Background Scheduler...');
    
    // Run an initial sync check shortly after server startup (e.g. 5 seconds)
    setTimeout(() => {
      this.runSyncCheck().catch(err => {
        console.error('Error in initial social sync check:', err);
      });
    }, 5000);

    // Schedule checking loop
    this.timer = setInterval(() => {
      this.runSyncCheck().catch(err => {
        console.error('Error in scheduled social sync check:', err);
      });
    }, this.checkIntervalMs);
  }

  /**
   * Stops the background scheduler.
   */
  public static stopScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('🛑 Social Background Scheduler stopped.');
    }
  }

  /**
   * Scans for all social accounts and performs sync if last updated > 6 hours ago.
   */
  private static async runSyncCheck() {
    console.log('🔍 Running Scheduled Social Synchronization check...');
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    try {
      // Find all social accounts that haven't been updated in the last 6 hours
      const accountsToSync = await prisma.socialAccount.findMany({
        where: {
          updatedAt: {
            lt: sixHoursAgo,
          },
        },
      });

      console.log(`Found ${accountsToSync.length} social accounts requiring sync.`);

      for (const account of accountsToSync) {
        try {
          console.log(`🔄 Scheduled Syncing platform ${account.platform} for user ${account.userId}...`);
          const count = await SocialSyncService.syncAccount(account.userId, account.platform, account.platformUserId);
          console.log(`Successfully synced ${count} posts for ${account.platform} (User: ${account.userId})`);
        } catch (syncErr) {
          console.error(`Failed to sync scheduled account ${account.id}:`, syncErr);
        }
      }
    } catch (err) {
      console.error('Failed to run scheduled social sync check:', err);
    }
  }
}
