"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCSV = uploadCSV;
exports.getJobStatus = getJobStatus;
exports.getCampaigns = getCampaigns;
const db_1 = __importDefault(require("../db"));
const queue_1 = require("../services/queue");
/**
 * Handle CSV File upload and register a processing job
 */
async function uploadCSV(req, res) {
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
        const jobId = await queue_1.QueueService.addJob(userId, filePath, originalName);
        return res.status(202).json({
            message: 'CSV uploaded and queued for processing successfully.',
            jobId,
            status: 'PENDING',
        });
    }
    catch (error) {
        console.error('File Upload Error:', error);
        return res.status(500).json({ error: 'Server error processing campaign upload.' });
    }
}
/**
 * Check the status of a background job
 */
async function getJobStatus(req, res) {
    try {
        const userId = req.user?.id;
        const jobId = req.params.jobId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }
        const job = await db_1.default.job.findUnique({
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
    }
    catch (error) {
        console.error('Get Job Status Error:', error);
        return res.status(500).json({ error: 'Server error retrieving job status.' });
    }
}
/**
 * List campaigns for the authenticated user
 */
async function getCampaigns(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }
        const campaigns = await db_1.default.campaign.findMany({
            where: { userId },
            include: {
                metrics: {
                    orderBy: { date: 'asc' },
                },
            },
        });
        return res.json(campaigns);
    }
    catch (error) {
        console.error('Get Campaigns Error:', error);
        return res.status(500).json({ error: 'Server error retrieving campaigns.' });
    }
}
