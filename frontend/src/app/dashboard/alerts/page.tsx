'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import {
  Bell,
  Loader2,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  Mail,
  RefreshCw,
  Send,
  Target,
  Link2,
} from 'lucide-react';

interface AnomalyAlert {
  id: string;
  campaignName: string;
  platform: string;
  date: string;
  metric: string;
  severity: string;
  currentValue: number;
  baselineValue: number;
  zScore: number;
  percentChange: number;
  message: string;
  notified: boolean;
  createdAt: string;
}

interface AlertSettings {
  enabled: boolean;
  slackWebhookUrl: string | null;
  emailAlerts: boolean;
  zScoreThreshold: number;
  lookbackDays: number;
  cpaEnabled: boolean;
  ctrEnabled: boolean;
  spendEnabled: boolean;
}

const METRIC_LABELS: Record<string, string> = {
  cpa: 'CPA',
  ctr: 'CTR',
  spend: 'Spend',
};

export default function AnomalyAlertsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [settings, setSettings] = useState<AlertSettings>({
    enabled: true,
    slackWebhookUrl: null,
    emailAlerts: true,
    zScoreThreshold: 2.0,
    lookbackDays: 14,
    cpaEnabled: true,
    ctrEnabled: true,
    spendEnabled: true,
  });

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/anomalies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load alerts.');
      setAlerts(data.alerts || []);
      if (data.settings) setSettings(data.settings);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load anomaly alerts.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSettings = async () => {
    if (!token) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`${API_BASE_URL}/anomalies/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings.');
      setSettings(data.settings);
      setSuccess('Alert settings saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleScan = async () => {
    if (!token) return;
    try {
      setScanning(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`${API_BASE_URL}/anomalies/scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed.');
      setAlerts(data.alerts || []);
      const msg =
        data.detected > 0
          ? `Found ${data.detected} new anomal${data.detected === 1 ? 'y' : 'ies'}${data.notified ? ' — notifications sent' : ''}.`
          : 'No new anomalies detected.';
      setSuccess(msg);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setScanning(false);
    }
  };

  const handleTestAlert = async () => {
    if (!token) return;
    try {
      setTesting(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`${API_BASE_URL}/anomalies/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test notification failed.');
      const channels = [
        data.result?.slack && 'Slack',
        data.result?.email && 'Email',
      ].filter(Boolean);
      setSuccess(
        channels.length > 0
          ? `Test alert sent via ${channels.join(' & ')}.`
          : 'Test completed but no channel delivered. Check your configuration.'
      );
      if (data.result?.errors?.length) {
        setError(data.result.errors.join(' '));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Test notification failed.');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col justify-center items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900 dark:text-zinc-100" />
        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Loading anomaly monitor...</span>
      </div>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="space-y-6 md:space-y-8 z-10 relative">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7" />
            Anomaly Alerts
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
            Z-score monitoring for CPA spikes, CTR drops, and spend overshoots — with Slack and email notifications.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-950 dark:bg-zinc-800 text-white disabled:opacity-60"
          >
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Scan now
          </button>
        </div>
      </div>

      {(error || success) && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs ${
            error
              ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
              : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Total alerts</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{alerts.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Critical</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{criticalCount}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Warnings</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{warningCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Alert configuration
          </h2>

          <label className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400">Monitoring enabled</span>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
              className="rounded border-zinc-300"
            />
          </label>

          <div>
            <label className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mb-1.5">
              <Link2 className="w-3.5 h-3.5" /> Slack webhook URL
            </label>
            <input
              type="url"
              value={settings.slackWebhookUrl || ''}
              onChange={(e) => setSettings((s) => ({ ...s, slackWebhookUrl: e.target.value || null }))}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-xs"
            />
          </div>

          <label className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email alerts (Resend)
            </span>
            <input
              type="checkbox"
              checked={settings.emailAlerts}
              onChange={(e) => setSettings((s) => ({ ...s, emailAlerts: e.target.checked }))}
              className="rounded border-zinc-300"
            />
          </label>

          <div>
            <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1.5 block">
              Z-score threshold: <strong>{settings.zScoreThreshold.toFixed(1)}σ</strong>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={0.1}
              value={settings.zScoreThreshold}
              onChange={(e) => setSettings((s) => ({ ...s, zScoreThreshold: Number(e.target.value) }))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1.5 block">
              Lookback window: <strong>{settings.lookbackDays} days</strong>
            </label>
            <input
              type="range"
              min={3}
              max={30}
              step={1}
              value={settings.lookbackDays}
              onChange={(e) => setSettings((s) => ({ ...s, lookbackDays: Number(e.target.value) }))}
              className="w-full"
            />
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            {(['cpaEnabled', 'ctrEnabled', 'spendEnabled'] as const).map((key) => (
              <label key={key} className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))}
                  className="rounded border-zinc-300"
                />
                {key === 'cpaEnabled' ? 'CPA spikes' : key === 'ctrEnabled' ? 'CTR drops' : 'Spend overshoot'}
              </label>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-950 dark:bg-zinc-800 text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save settings'}
            </button>
            <button
              onClick={handleTestAlert}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-300 dark:border-zinc-600 disabled:opacity-60"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Test
            </button>
          </div>

          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Email requires <code className="text-zinc-600 dark:text-zinc-400">RESEND_API_KEY</code> and{' '}
            <code className="text-zinc-600 dark:text-zinc-400">RESEND_FROM_EMAIL</code> in backend .env.
          </p>
        </div>

        {/* Alert feed */}
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-2 mb-4">
            <Target className="w-4 h-4" /> Recent anomalies
          </h2>

          {alerts.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-xs">No anomalies detected yet. Upload data or run a scan.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-xl border p-3 text-xs ${
                    alert.severity === 'critical'
                      ? 'border-red-300 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-amber-300 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
                      {alert.severity === 'critical' ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      {alert.campaignName}
                    </div>
                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {METRIC_LABELS[alert.metric] || alert.metric}
                    </span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{alert.message}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-zinc-500">
                    <span>{alert.platform}</span>
                    <span>{alert.date}</span>
                    <span>z={alert.zScore}</span>
                    {alert.notified && <span className="text-emerald-600 dark:text-emerald-400">notified</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200 mb-2">How detection works</h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          For each campaign, we compare the latest day&apos;s CPA, CTR, and spend against a rolling baseline
          (default 14 days). When values exceed <strong>z-score thresholds</strong>, alerts are saved and optionally
          pushed to Slack or email. Scans run automatically after every CSV upload.
        </p>
      </div>
    </div>
  );
}
