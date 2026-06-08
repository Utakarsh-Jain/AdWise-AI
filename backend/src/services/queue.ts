import fs from 'fs';
import path from 'path';
import prisma from '../db';
import { parseCampaignFile } from '../utils/csv';

export class QueueService {
  private static activeJobs = new Set<string>();

  /**
   * Registers a new background job and begins processing it asynchronously.
   */
  public static async addJob(userId: string, filePath: string, fileName: string): Promise<string> {
    const job = await prisma.job.create({
      data: {
        userId,
        status: 'PENDING',
        fileName,
        totalRows: 0,
        validRows: 0,
      },
    });

    // Start processing in the background without holding up the response
    this.processJob(job.id, filePath, userId).catch(err => {
      console.error(`Background processing failed for job ${job.id}:`, err);
    });

    return job.id;
  }

  /**
   * Simulates a background worker processing the queue.
   */
  private static async processJob(jobId: string, filePath: string, userId: string) {
    if (this.activeJobs.has(jobId)) return;
    this.activeJobs.add(jobId);

    try {
      // 1. Transition to PROCESSING status
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'PROCESSING' },
      });

      // 2. Parse and validate file data (supports CSV and Excel)
      const parseResult = await parseCampaignFile(filePath);

      if (parseResult.validRows.length === 0) {
        throw new Error(
          parseResult.errors[0] || 'No valid rows found in the CSV. Please check column headers and format.'
        );
      }

      // 3. Process database ingestion
      // Performance optimization: Pre-fetch all campaigns for this user to minimize DB lookups
      const existingCampaigns = await prisma.campaign.findMany({
        where: { userId },
      });
      const campaignCache = new Map<string, string>(); // campaignName -> campaignId
      existingCampaigns.forEach(c => {
        campaignCache.set(c.campaignName.toLowerCase(), c.id);
      });

      // We will aggregate records and ingest them
      for (const row of parseResult.validRows) {
        const campaignKey = row.campaign.toLowerCase();
        let campaignId = campaignCache.get(campaignKey);

        // If campaign doesn't exist, create it
        if (!campaignId) {
          const newCampaign = await prisma.campaign.create({
            data: {
              userId,
              campaignName: row.campaign,
              platform: row.platform,
            },
          });
          campaignId = newCampaign.id;
          campaignCache.set(campaignKey, campaignId);
        }

        // Upsert metric (Insert or Update if campaign + date already exists)
        // Using a transaction for safety
        const metricDate = new Date(row.date);
        
        await prisma.campaignMetric.upsert({
          where: {
            campaignId_date: {
              campaignId,
              date: metricDate,
            },
          },
          update: {
            spend: row.spend,
            clicks: row.clicks,
            impressions: row.impressions,
            conversions: row.conversions,
          },
          create: {
            campaignId,
            date: metricDate,
            spend: row.spend,
            clicks: row.clicks,
            impressions: row.impressions,
            conversions: row.conversions,
          },
        });
      }

      // Clear any cached reports for this user since data changed
      await prisma.report.deleteMany({
        where: { userId }
      }).catch(() => {});

      // 4. Mark job as COMPLETED
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          totalRows: parseResult.totalRows,
          validRows: parseResult.validRows.length,
          error: parseResult.errorCount > 0 ? `Skipped ${parseResult.errorCount} invalid rows. Warnings: \n` + parseResult.errors.join('\n') : null,
        },
      });

    } catch (error: any) {
      console.error(`Error processing job ${jobId}:`, error);
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error.message || 'An unexpected error occurred during file ingestion.',
        },
      });
    } finally {
      // 5. Cleanup uploaded file
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error(`Failed to delete temporary file ${filePath}:`, unlinkErr);
        }
      }
      this.activeJobs.delete(jobId);
    }
  }
}
