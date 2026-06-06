import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../db';
import { QueueService } from '../services/queue';

/**
 * Handle CSV File upload and register a processing job
 */
export async function uploadCSV(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const file = req.file;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user context.' });
    }

    if (!file) {
      return res.status(400).json({ error: 'Please upload a CSV file.' });
    }

    const filePath = file.path;
    const originalName = file.originalname;

    // Trigger background queue processing and get jobId
    const jobId = await QueueService.addJob(userId, filePath, originalName);

    return res.status(202).json({
      message: 'CSV uploaded and queued for processing successfully.',
      jobId,
      status: 'PENDING',
    });
  } catch (error: any) {
    console.error('File Upload Error:', error);
    return res.status(500).json({ error: 'Server error processing campaign upload.' });
  }
}

/**
 * Check the status of a background job
 */
export async function getJobStatus(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const jobId = req.params.jobId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (job.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden. Access denied.' });
    }

    return res.json({
      id: job.id,
      status: job.status,
      fileName: job.fileName,
      totalRows: job.totalRows,
      validRows: job.validRows,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (error: any) {
    console.error('Get Job Status Error:', error);
    return res.status(500).json({ error: 'Server error retrieving job status.' });
  }
}

/**
 * List campaigns for the authenticated user
 */
export async function getCampaigns(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      include: {
        metrics: {
          orderBy: { date: 'asc' },
        },
      },
    });

    return res.json(campaigns);
  } catch (error: any) {
    console.error('Get Campaigns Error:', error);
    return res.status(500).json({ error: 'Server error retrieving campaigns.' });
  }
}
