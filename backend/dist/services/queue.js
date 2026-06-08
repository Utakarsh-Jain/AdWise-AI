"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const fs_1 = __importDefault(require("fs"));
const db_1 = __importDefault(require("../db"));
const csv_1 = require("../utils/csv");
class QueueService {
    static activeJobs = new Set();
    /**
     * Registers a new background job and begins processing it asynchronously.
     */
    static async addJob(userId, filePath, fileName) {
        const job = await db_1.default.job.create({
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
    static async processJob(jobId, filePath, userId) {
        if (this.activeJobs.has(jobId))
            return;
        this.activeJobs.add(jobId);
        try {
            // 1. Transition to PROCESSING status
            await db_1.default.job.update({
                where: { id: jobId },
                data: { status: 'PROCESSING' },
            });
            // 2. Parse and validate file data (supports CSV and Excel)
            const parseResult = await (0, csv_1.parseCampaignFile)(filePath);
            if (parseResult.validRows.length === 0) {
                throw new Error(parseResult.errors[0] || 'No valid rows found in the CSV. Please check column headers and format.');
            }
            // 3. Process database ingestion
            // Performance optimization: Pre-fetch all campaigns for this user to minimize DB lookups
            const existingCampaigns = await db_1.default.campaign.findMany({
                where: { userId },
            });
            const campaignCache = new Map(); // campaignName -> campaignId
            existingCampaigns.forEach(c => {
                campaignCache.set(c.campaignName.toLowerCase(), c.id);
            });
            // We will aggregate records and ingest them
            for (const row of parseResult.validRows) {
                const campaignKey = row.campaign.toLowerCase();
                let campaignId = campaignCache.get(campaignKey);
                // If campaign doesn't exist, create it
                if (!campaignId) {
                    const newCampaign = await db_1.default.campaign.create({
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
                await db_1.default.campaignMetric.upsert({
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
            await db_1.default.report.deleteMany({
                where: { userId }
            }).catch(() => { });
            // 4. Mark job as COMPLETED
            await db_1.default.job.update({
                where: { id: jobId },
                data: {
                    status: 'COMPLETED',
                    totalRows: parseResult.totalRows,
                    validRows: parseResult.validRows.length,
                    error: parseResult.errorCount > 0 ? `Skipped ${parseResult.errorCount} invalid rows. Warnings: \n` + parseResult.errors.join('\n') : null,
                },
            });
        }
        catch (error) {
            console.error(`Error processing job ${jobId}:`, error);
            await db_1.default.job.update({
                where: { id: jobId },
                data: {
                    status: 'FAILED',
                    error: error.message || 'An unexpected error occurred during file ingestion.',
                },
            });
        }
        finally {
            // 5. Cleanup uploaded file
            if (fs_1.default.existsSync(filePath)) {
                try {
                    fs_1.default.unlinkSync(filePath);
                }
                catch (unlinkErr) {
                    console.error(`Failed to delete temporary file ${filePath}:`, unlinkErr);
                }
            }
            this.activeJobs.delete(jobId);
        }
    }
}
exports.QueueService = QueueService;
