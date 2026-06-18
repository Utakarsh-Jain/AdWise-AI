import type { AnomalyAlert } from '@prisma/client';

export interface NotificationResult {
  slack: boolean;
  email: boolean;
  errors: string[];
}

function buildAlertSummary(alerts: AnomalyAlert[], userName: string): { subject: string; text: string; html: string } {
  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const warning = alerts.filter((a) => a.severity === 'warning').length;

  const subject = `AdWise AI: ${alerts.length} campaign anomaly alert${alerts.length === 1 ? '' : 's'}`;
  const lines = alerts.map(
    (a) =>
      `• [${a.severity.toUpperCase()}] ${a.campaignName} (${a.platform}) — ${a.message}`
  );

  const text = `Hi ${userName},\n\nWe detected ${alerts.length} anomalies in your campaigns (${critical} critical, ${warning} warning):\n\n${lines.join('\n')}\n\n— AdWise AI Monitoring`;

  const html = `
    <h2>Campaign Anomaly Alerts</h2>
    <p>Hi ${userName}, we detected <strong>${alerts.length}</strong> anomalies (${critical} critical, ${warning} warning).</p>
    <ul>
      ${alerts.map((a) => `<li><strong>[${a.severity.toUpperCase()}]</strong> ${a.campaignName} (${a.platform}) — ${a.message}</li>`).join('')}
    </ul>
    <p style="color:#71717a;font-size:12px;">— AdWise AI Monitoring</p>
  `;

  return { subject, text, html };
}

export async function sendSlackAlert(webhookUrl: string, alerts: AnomalyAlert[], userName: string): Promise<void> {
  const { text } = buildAlertSummary(alerts, userName);

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🚨 *AdWise AI Anomaly Alert*\n${text}`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Slack webhook failed (${res.status}): ${body}`);
  }
}

export async function sendEmailAlert(
  toEmail: string,
  alerts: AnomalyAlert[],
  userName: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const { subject, html, text } = buildAlertSummary(alerts, userName);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend email failed (${res.status}): ${body}`);
  }
}

export async function dispatchAnomalyAlerts(
  alerts: AnomalyAlert[],
  options: {
    userName: string;
    userEmail: string;
    slackWebhookUrl?: string | null;
    emailAlerts: boolean;
  }
): Promise<NotificationResult> {
  const result: NotificationResult = { slack: false, email: false, errors: [] };

  if (alerts.length === 0) return result;

  if (options.slackWebhookUrl) {
    try {
      await sendSlackAlert(options.slackWebhookUrl, alerts, options.userName);
      result.slack = true;
    } catch (err: unknown) {
      result.errors.push(err instanceof Error ? err.message : 'Slack delivery failed');
    }
  }

  if (options.emailAlerts) {
    try {
      await sendEmailAlert(options.userEmail, alerts, options.userName);
      result.email = true;
    } catch (err: unknown) {
      result.errors.push(err instanceof Error ? err.message : 'Email delivery failed');
    }
  }

  return result;
}

export async function sendTestNotification(options: {
  userName: string;
  userEmail: string;
  slackWebhookUrl?: string | null;
  emailAlerts: boolean;
}): Promise<NotificationResult> {
  const fakeAlert = {
    id: 'test',
    userId: 'test',
    campaignId: null,
    campaignName: 'Demo Campaign',
    platform: 'Google',
    date: new Date().toISOString().slice(0, 10),
    metric: 'cpa',
    severity: 'warning',
    currentValue: 42.5,
    baselineValue: 28.0,
    zScore: 2.4,
    percentChange: 51.8,
    message: 'WARNING: CPA spiked 51.8% ($42.50 vs baseline $28.00)',
    notified: false,
    createdAt: new Date(),
  } satisfies AnomalyAlert;

  return dispatchAnomalyAlerts([fakeAlert], options);
}
