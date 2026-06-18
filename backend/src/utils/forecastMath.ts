import { isIndiaHoliday } from './indiaHolidays';

export interface DailyMetric {
  date: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
}

export interface ForecastPoint {
  date: string;
  actualSpend?: number;
  actualClicks?: number;
  actualImpressions?: number;
  actualConversions?: number;
  forecastSpend?: number;
  forecastClicks?: number;
  forecastImpressions?: number;
  forecastConversions?: number;
}

export interface ForecastResult {
  historical: ForecastPoint[];
  forecast: ForecastPoint[];
}

type MetricKey = 'spend' | 'clicks' | 'impressions' | 'conversions';

const METRIC_CONFIG: { key: MetricKey; integer: boolean; decimals?: number }[] = [
  { key: 'spend', integer: false, decimals: 2 },
  { key: 'clicks', integer: true },
  { key: 'impressions', integer: true },
  { key: 'conversions', integer: true },
];

const REGRESSION_WEIGHT = 0.7;
const MOVING_AVG_WEIGHT = 0.3;
const HOLIDAY_DAMPENING = 0.75;

/** Format a Date as YYYY-MM-DD in UTC (avoids local timezone shifts). */
export function formatDateUTC(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Add days to a YYYY-MM-DD date string using UTC calendar math. */
export function addDaysUTC(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateUTC(d);
}

/** Calendar days between two YYYY-MM-DD strings (end - start). */
export function daysBetweenUTC(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00.000Z`).getTime();
  const e = new Date(`${end}T00:00:00.000Z`).getTime();
  return Math.round((e - s) / 86_400_000);
}

/** Day of week in UTC: 0 = Sunday … 6 = Saturday. */
export function getDayOfWeekUTC(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();
}

/** Least Squares Method: slope (m) and intercept (c) for y = mx + c */
export function calculateLinearRegression(x: number[], y: number[]) {
  const n = x.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let den = 0;

  for (let i = 0; i < n; i++) {
    num += (x[i] - meanX) * (y[i] - meanY);
    den += Math.pow(x[i] - meanX, 2);
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  return { slope, intercept };
}

/** Nth occurrence of a weekday in a month (1-based), e.g. 3rd Monday. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): number {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const parsed = new Date(`${dateStr}T00:00:00.000Z`);
    if (parsed.getUTCMonth() + 1 !== month) break;
    if (parsed.getUTCDay() === weekday) {
      count++;
      if (count === n) return day;
    }
  }
  return -1;
}

/** Last occurrence of a weekday in a month. */
function lastWeekdayOfMonth(year: number, month: number, weekday: number): number {
  let last = -1;
  for (let day = 1; day <= 31; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const parsed = new Date(`${dateStr}T00:00:00.000Z`);
    if (parsed.getUTCMonth() + 1 !== month) break;
    if (parsed.getUTCDay() === weekday) last = day;
  }
  return last;
}

/** US federal holidays — weekends/holidays dampen projected volume. */
export function isUSHoliday(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);

  if (month === 1 && day === 1) return true;
  if (month === 6 && day === 19) return true;
  if (month === 7 && day === 4) return true;
  if (month === 11 && day === 11) return true;
  if (month === 12 && day === 25) return true;

  if (month === 1 && day === nthWeekdayOfMonth(year, 1, 1, 3)) return true;
  if (month === 2 && day === nthWeekdayOfMonth(year, 2, 1, 3)) return true;
  if (month === 5 && day === lastWeekdayOfMonth(year, 5, 1)) return true;
  if (month === 9 && day === nthWeekdayOfMonth(year, 9, 1, 1)) return true;
  if (month === 10 && day === nthWeekdayOfMonth(year, 10, 1, 2)) return true;
  if (month === 11 && day === nthWeekdayOfMonth(year, 11, 4, 4)) return true;

  return false;
}

/** US or India public holiday — both regions dampen projected ad volume. */
export function isHoliday(dateStr: string): boolean {
  return isUSHoliday(dateStr) || isIndiaHoliday(dateStr);
}

/** Day-of-week seasonal indices (length 7), normalized to average ≈ 1. */
export function computeDowSeasonalFactors(
  sorted: DailyMetric[],
  metric: MetricKey
): number[] {
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  let totalSum = 0;

  for (const row of sorted) {
    const dow = getDayOfWeekUTC(row.date);
    const val = row[metric];
    sums[dow] += val;
    counts[dow]++;
    totalSum += val;
  }

  const overallAvg = sorted.length > 0 ? totalSum / sorted.length : 1;
  const factors = Array(7).fill(1);

  for (let d = 0; d < 7; d++) {
    if (counts[d] > 0 && overallAvg > 0) {
      factors[d] = sums[d] / counts[d] / overallAvg;
    }
  }

  return factors;
}

function getSeasonalMultiplier(dateStr: string, dowFactors: number[]): number {
  let mult = dowFactors[getDayOfWeekUTC(dateStr)] ?? 1;
  if (isHoliday(dateStr)) {
    mult *= HOLIDAY_DAMPENING;
  }
  return mult;
}

function roundMetric(value: number, integer: boolean, decimals = 2): number {
  if (integer) return Math.round(value);
  return parseFloat(value.toFixed(decimals));
}

function blendForecast(
  sorted: DailyMetric[],
  metric: MetricKey,
  xFuture: number
): number {
  const xValues = sorted.map((h) => daysBetweenUTC(sorted[0].date, h.date));
  const yValues = sorted.map((h) => h[metric]);
  const regression = calculateLinearRegression(xValues, yValues);

  const window = Math.min(7, sorted.length);
  const recent = yValues.slice(-window);
  const movingAvg = recent.reduce((a, b) => a + b, 0) / window;

  let lrValue = regression.slope * xFuture + regression.intercept;
  lrValue = Math.max(0, lrValue);

  return lrValue * REGRESSION_WEIGHT + movingAvg * MOVING_AVG_WEIGHT;
}

/** Enforce clicks ≤ impressions and conversions ≤ clicks on forecast values. */
function enforceMetricConsistency(values: Record<MetricKey, number>): Record<MetricKey, number> {
  const out = { ...values };
  out.impressions = Math.max(out.impressions, out.clicks);
  out.clicks = Math.min(out.clicks, out.impressions);
  out.conversions = Math.min(out.conversions, out.clicks);
  return out;
}

/**
 * Forecast spend, clicks, impressions, and conversions from daily aggregates.
 * Uses calendar-day regression (handles date gaps), day-of-week seasonality,
 * and US + India holiday dampening. Requires at least 3 unique days of history.
 */
export function buildForecastFromDailyData(
  historicalData: DailyMetric[],
  daysToForecast = 7
): ForecastResult {
  if (historicalData.length < 3) {
    return { historical: [], forecast: [] };
  }

  const sorted = [...historicalData].sort((a, b) => a.date.localeCompare(b.date));
  const n = sorted.length;
  const lastDateStr = sorted[n - 1].date;
  const lastX = daysBetweenUTC(sorted[0].date, lastDateStr);

  const dowFactorsByMetric = Object.fromEntries(
    METRIC_CONFIG.map(({ key }) => [key, computeDowSeasonalFactors(sorted, key)])
  ) as Record<MetricKey, number[]>;

  const historicalPoints: ForecastPoint[] = sorted.map((h) => ({
    date: h.date,
    actualSpend: h.spend,
    actualClicks: h.clicks,
    actualImpressions: h.impressions,
    actualConversions: h.conversions,
  }));

  const forecastPoints: ForecastPoint[] = [];

  for (let i = 1; i <= daysToForecast; i++) {
    const date = addDaysUTC(lastDateStr, i);
    const xFuture = lastX + i;

    const raw: Record<MetricKey, number> = {
      spend: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
    };

    for (const { key, integer, decimals } of METRIC_CONFIG) {
      const base = blendForecast(sorted, key, xFuture);
      const seasonal = base * getSeasonalMultiplier(date, dowFactorsByMetric[key]);
      raw[key] = roundMetric(Math.max(0, seasonal), integer, decimals);
    }

    const consistent = enforceMetricConsistency(raw);

    forecastPoints.push({
      date,
      forecastSpend: consistent.spend,
      forecastClicks: consistent.clicks,
      forecastImpressions: consistent.impressions,
      forecastConversions: consistent.conversions,
    });
  }

  return {
    historical: historicalPoints,
    forecast: forecastPoints,
  };
}
