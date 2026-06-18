import prisma from '../db';
import {
  detectCampaignAnomalies,
  type AnomalyDetectionConfig,
  type DetectedAnomaly,
} from '../utils/anomalyDetection';
import { formatDateUTC } from '../utils/forecastMath';
import { dispatchAnomalyAlerts } from './alertNotifier';

export interface AlertSettingsDto {
  enabled: boolean;
  slackWebhookUrl: string | null;
  emailAlerts: boolean;
  zScoreThreshold: number;
  lookbackDays: number;
  cpaEnabled: boolean;
  ctrEnabled: boolean;
  spendEnabled: boolean;
}

export class AnomalyService {
  static async getOrCreateSettings(userId: string): Promise<AlertSettingsDto> {
    const row = await prisma.alertSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    return {
      enabled: row.enabled,
      slackWebhookUrl: row.slackWebhookUrl,
      emailAlerts: row.emailAlerts,
      zScoreThreshold: row.zScoreThreshold,
      lookbackDays: row.lookbackDays,
      cpaEnabled: row.cpaEnabled,
      ctrEnabled: row.ctrEnabled,
      spendEnabled: row.spendEnabled,
    };
  }

  static async updateSettings(userId: string, input: Partial<AlertSettingsDto>): Promise<AlertSettingsDto> {
    const row = await prisma.alertSettings.upsert({
      where: { userId },
      create: {
        userId,
        enabled: input.enabled ?? true,
        slackWebhookUrl: input.slackWebhookUrl ?? null,
        emailAlerts: input.emailAlerts ?? true,
        zScoreThreshold: input.zScoreThreshold ?? 2.0,
        lookbackDays: input.lookbackDays ?? 14,
        cpaEnabled: input.cpaEnabled ?? true,
        ctrEnabled: input.ctrEnabled ?? true,
        spendEnabled: input.spendEnabled ?? true,
      },
      update: {
        ...(input.enabled !== undefined && { enabled: input.enabled }),
        ...(input.slackWebhookUrl !== undefined && { slackWebhookUrl: input.slackWebhookUrl || null }),
        ...(input.emailAlerts !== undefined && { emailAlerts: input.emailAlerts }),
        ...(input.zScoreThreshold !== undefined && { zScoreThreshold: input.zScoreThreshold }),
        ...(input.lookbackDays !== undefined && { lookbackDays: input.lookbackDays }),
        ...(input.cpaEnabled !== undefined && { cpaEnabled: input.cpaEnabled }),
        ...(input.ctrEnabled !== undefined && { ctrEnabled: input.ctrEnabled }),
        ...(input.spendEnabled !== undefined && { spendEnabled: input.spendEnabled }),
      },
    });

    return {
      enabled: row.enabled,
      slackWebhookUrl: row.slackWebhookUrl,
      emailAlerts: row.emailAlerts,
      zScoreThreshold: row.zScoreThreshold,
      lookbackDays: row.lookbackDays,
      cpaEnabled: row.cpaEnabled,
      ctrEnabled: row.ctrEnabled,
      spendEnabled: row.spendEnabled,
    };
  }

  static async listAlerts(userId: string, limit = 50) {
    return prisma.anomalyAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async scanUserCampaigns(userId: string, sendNotifications = true) {
    const settings = await this.getOrCreateSettings(userId);
    if (!settings.enabled) {
      return { detected: 0, saved: 0, notified: false, settings };
    }

    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      include: { metrics: { orderBy: { date: 'asc' } } },
    });

    const config: Partial<AnomalyDetectionConfig> = {
      zScoreThreshold: settings.zScoreThreshold,
      lookbackDays: settings.lookbackDays,
      cpaEnabled: settings.cpaEnabled,
      ctrEnabled: settings.ctrEnabled,
      spendEnabled: settings.spendEnabled,
    };

    const newAlerts: DetectedAnomaly[] = [];

    for (const campaign of campaigns) {
      if (campaign.metrics.length < 4) continue;

      const daily = campaign.metrics.map((m) => ({
        date: formatDateUTC(m.date),
        spend: m.spend,
        clicks: m.clicks,
        impressions: m.impressions,
        conversions: m.conversions,
      }));

      const found = detectCampaignAnomalies(daily, config);
      if (found.length === 0) continue;

      for (const anomaly of found) {
        const exists = await prisma.anomalyAlert.findFirst({
          where: {
            userId,
            campaignId: campaign.id,
            metric: anomaly.metric,
            date: anomaly.date,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (exists) continue;

        newAlerts.push(anomaly);
        await prisma.anomalyAlert.create({
          data: {
            userId,
            campaignId: campaign.id,
            campaignName: campaign.campaignName,
            platform: campaign.platform,
            date: anomaly.date,
            metric: anomaly.metric,
            severity: anomaly.severity,
            currentValue: anomaly.currentValue,
            baselineValue: anomaly.baselineValue,
            zScore: anomaly.zScore,
            percentChange: anomaly.percentChange,
            message: anomaly.message,
          },
        });
      }
    }

    let notified = false;
    let notificationErrors: string[] = [];

    if (sendNotifications && newAlerts.length > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const savedRows = await prisma.anomalyAlert.findMany({
          where: {
            userId,
            notified: false,
            createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (savedRows.length > 0 && (settings.slackWebhookUrl || settings.emailAlerts)) {
          const result = await dispatchAnomalyAlerts(savedRows, {
            userName: user.name,
            userEmail: user.email,
            slackWebhookUrl: settings.slackWebhookUrl,
            emailAlerts: settings.emailAlerts,
          });

          notified = result.slack || result.email;
          notificationErrors = result.errors;

          if (notified) {
            await prisma.anomalyAlert.updateMany({
              where: { id: { in: savedRows.map((r) => r.id) } },
              data: { notified: true },
            });
          }
        }
      }
    }

    return {
      detected: newAlerts.length,
      saved: newAlerts.length,
      notified,
      notificationErrors,
      settings,
    };
  }
}
