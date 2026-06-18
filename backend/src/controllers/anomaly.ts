import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AnomalyService } from '../services/anomaly';
import { sendTestNotification } from '../services/alertNotifier';
import prisma from '../db';

export async function getAnomalyAlerts(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const [alerts, settings] = await Promise.all([
      AnomalyService.listAlerts(userId),
      AnomalyService.getOrCreateSettings(userId),
    ]);

    return res.json({ alerts, settings });
  } catch (error: unknown) {
    console.error('Get anomaly alerts error:', error);
    return res.status(500).json({ error: 'Failed to load anomaly alerts.' });
  }
}

export async function scanAnomalies(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const result = await AnomalyService.scanUserCampaigns(userId, true);
    const alerts = await AnomalyService.listAlerts(userId);

    return res.json({ ...result, alerts });
  } catch (error: unknown) {
    console.error('Scan anomalies error:', error);
    return res.status(500).json({ error: 'Failed to scan for anomalies.' });
  }
}

export async function updateAlertSettings(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const body = req.body ?? {};
    const zScoreThreshold = body.zScoreThreshold != null ? Number(body.zScoreThreshold) : undefined;
    const lookbackDays = body.lookbackDays != null ? Number(body.lookbackDays) : undefined;

    if (zScoreThreshold != null && (zScoreThreshold < 1 || zScoreThreshold > 5)) {
      return res.status(400).json({ error: 'Z-score threshold must be between 1 and 5.' });
    }
    if (lookbackDays != null && (lookbackDays < 3 || lookbackDays > 60)) {
      return res.status(400).json({ error: 'Lookback days must be between 3 and 60.' });
    }

    const settings = await AnomalyService.updateSettings(userId, {
      enabled: body.enabled,
      slackWebhookUrl: body.slackWebhookUrl,
      emailAlerts: body.emailAlerts,
      zScoreThreshold,
      lookbackDays,
      cpaEnabled: body.cpaEnabled,
      ctrEnabled: body.ctrEnabled,
      spendEnabled: body.spendEnabled,
    });

    return res.json({ settings });
  } catch (error: unknown) {
    console.error('Update alert settings error:', error);
    return res.status(500).json({ error: 'Failed to update alert settings.' });
  }
}

export async function testAlertNotification(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const settings = await AnomalyService.getOrCreateSettings(userId);

    if (!settings.slackWebhookUrl && !settings.emailAlerts) {
      return res.status(400).json({
        error: 'Configure a Slack webhook URL or enable email alerts first.',
      });
    }

    const result = await sendTestNotification({
      userName: user.name,
      userEmail: user.email,
      slackWebhookUrl: settings.slackWebhookUrl,
      emailAlerts: settings.emailAlerts,
    });

    return res.json({
      message: 'Test notification sent.',
      result,
    });
  } catch (error: unknown) {
    console.error('Test alert error:', error);
    return res.status(500).json({ error: 'Failed to send test notification.' });
  }
}
