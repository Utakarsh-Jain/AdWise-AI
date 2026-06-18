export type AnomalyMetric = 'cpa' | 'ctr' | 'spend';

export type AnomalySeverity = 'warning' | 'critical';

export interface DailyCampaignMetric {
  date: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
}

export interface DetectedAnomaly {
  date: string;
  metric: AnomalyMetric;
  severity: AnomalySeverity;
  currentValue: number;
  baselineValue: number;
  zScore: number;
  percentChange: number;
  message: string;
}

export interface AnomalyDetectionConfig {
  zScoreThreshold: number;
  cpaEnabled: boolean;
  ctrEnabled: boolean;
  spendEnabled: boolean;
  lookbackDays: number;
}

const DEFAULT_CONFIG: AnomalyDetectionConfig = {
  zScoreThreshold: 2.0,
  cpaEnabled: true,
  ctrEnabled: true,
  spendEnabled: true,
  lookbackDays: 14,
};

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values: number[], avg?: number): number {
  if (values.length < 2) return 0;
  const m = avg ?? mean(values);
  const variance = values.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function zScore(value: number, avg: number, deviation: number): number {
  if (deviation === 0) return 0;
  return (value - avg) / deviation;
}

function dailyCpa(day: DailyCampaignMetric): number | null {
  if (day.conversions <= 0) return null;
  return day.spend / day.conversions;
}

function dailyCtr(day: DailyCampaignMetric): number | null {
  if (day.impressions <= 0) return null;
  return (day.clicks / day.impressions) * 100;
}

function percentChange(current: number, baseline: number): number {
  if (baseline === 0) return current === 0 ? 0 : 100;
  return parseFloat((((current - baseline) / baseline) * 100).toFixed(1));
}

function severityFromZ(z: number, threshold: number): AnomalySeverity | null {
  const abs = Math.abs(z);
  if (abs >= threshold * 1.5) return 'critical';
  if (abs >= threshold) return 'warning';
  return null;
}

function formatMetricValue(metric: AnomalyMetric, value: number): string {
  if (metric === 'spend') return `$${value.toFixed(2)}`;
  if (metric === 'ctr') return `${value.toFixed(2)}%`;
  return `$${value.toFixed(2)}`;
}

function buildMessage(
  metric: AnomalyMetric,
  severity: AnomalySeverity,
  current: number,
  baseline: number,
  pct: number
): string {
  const labels: Record<AnomalyMetric, string> = {
    cpa: 'CPA',
    ctr: 'CTR',
    spend: 'daily spend',
  };
  const direction =
    metric === 'ctr'
      ? pct < 0
        ? 'dropped'
        : 'spiked'
      : pct > 0
        ? 'spiked'
        : 'dropped';

  return `${severity.toUpperCase()}: ${labels[metric]} ${direction} ${Math.abs(pct)}% (${formatMetricValue(metric, current)} vs baseline ${formatMetricValue(metric, baseline)})`;
}

function isAnomalousDirection(metric: AnomalyMetric, z: number): boolean {
  if (metric === 'ctr') return z < 0;
  return z > 0;
}

/**
 * Detect anomalies on the latest day vs a rolling baseline window.
 * Requires at least 4 days of data (3 baseline + 1 current).
 */
export function detectCampaignAnomalies(
  metrics: DailyCampaignMetric[],
  config: Partial<AnomalyDetectionConfig> = {}
): DetectedAnomaly[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 4) return [];

  const latest = sorted[sorted.length - 1];
  const history = sorted.slice(0, -1).slice(-cfg.lookbackDays);

  if (history.length < 3) return [];

  const results: DetectedAnomaly[] = [];

  const checks: { metric: AnomalyMetric; enabled: boolean; extract: (d: DailyCampaignMetric) => number | null }[] = [
    { metric: 'cpa', enabled: cfg.cpaEnabled, extract: dailyCpa },
    { metric: 'ctr', enabled: cfg.ctrEnabled, extract: dailyCtr },
    { metric: 'spend', enabled: cfg.spendEnabled, extract: (d) => d.spend },
  ];

  for (const { metric, enabled, extract } of checks) {
    if (!enabled) continue;

    const baselineValues = history.map(extract).filter((v): v is number => v != null && Number.isFinite(v));
    const currentValue = extract(latest);
    if (baselineValues.length < 3 || currentValue == null) continue;

    const baselineAvg = mean(baselineValues);
    const deviation = stdDev(baselineValues, baselineAvg);
    const z = zScore(currentValue, baselineAvg, deviation);

    if (!isAnomalousDirection(metric, z)) continue;

    const severity = severityFromZ(z, cfg.zScoreThreshold);
    if (!severity) continue;

    const pct = percentChange(currentValue, baselineAvg);

    results.push({
      date: latest.date,
      metric,
      severity,
      currentValue: parseFloat(currentValue.toFixed(metric === 'spend' ? 2 : 4)),
      baselineValue: parseFloat(baselineAvg.toFixed(metric === 'spend' ? 2 : 4)),
      zScore: parseFloat(z.toFixed(2)),
      percentChange: pct,
      message: buildMessage(metric, severity, currentValue, baselineAvg, pct),
    });
  }

  return results;
}
