'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Loader2,
  AlertCircle,
  Sparkles,
  FileDown,
  Calendar,
  Target,
} from 'lucide-react';
import autoTable from 'jspdf-autotable';
import { createExecutivePdf, addSectionTitle } from '@/utils/pdfReport';

interface ForecastPoint {
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

type MetricKey = 'spend' | 'conversions' | 'clicks' | 'impressions';

interface MetricBacktestScores {
  mape: number;
  rmse: number;
  accuracy: number;
}

interface ForecastBacktest {
  holdoutDays: number;
  sampleCount: number;
  overallAccuracy: number;
  overallMape: number;
  overallRmse: number;
  byMetric: Record<MetricKey, MetricBacktestScores>;
}

const METRIC_OPTIONS: {
  key: MetricKey;
  label: string;
  actualKey: keyof ForecastPoint;
  forecastKey: keyof ForecastPoint;
  lightColor: string;
  darkColor: string;
}[] = [
  { key: 'spend', label: 'Spend', actualKey: 'actualSpend', forecastKey: 'forecastSpend', lightColor: '#18181b', darkColor: '#fafafa' },
  { key: 'conversions', label: 'Conversions', actualKey: 'actualConversions', forecastKey: 'forecastConversions', lightColor: '#059669', darkColor: '#34d399' },
  { key: 'clicks', label: 'Clicks', actualKey: 'actualClicks', forecastKey: 'forecastClicks', lightColor: '#2563eb', darkColor: '#60a5fa' },
  { key: 'impressions', label: 'Impressions', actualKey: 'actualImpressions', forecastKey: 'forecastImpressions', lightColor: '#d97706', darkColor: '#fbbf24' },
];

function bridgeHistoricalToForecast(historical: ForecastPoint[]): ForecastPoint[] {
  return historical.map((h, idx) => {
    if (idx !== historical.length - 1) return h;
    return {
      ...h,
      forecastSpend: h.actualSpend,
      forecastClicks: h.actualClicks,
      forecastImpressions: h.actualImpressions,
      forecastConversions: h.actualConversions,
    };
  });
}

function formatAxisValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(0)}k`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}

function formatMetricValue(key: MetricKey, value: number): string {
  if (key === 'spend') return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return value.toLocaleString();
}

function ForecastTooltip({
  active,
  payload,
  label,
  metricKey,
  theme,
}: {
  active?: boolean;
  payload?: { payload: ForecastPoint }[];
  label?: string;
  metricKey: MetricKey;
  theme: string;
}) {
  if (!active || !payload?.length || !label) return null;

  const point = payload[0].payload;
  const opt = METRIC_OPTIONS.find((m) => m.key === metricKey)!;
  const actual = point[opt.actualKey] as number | undefined;
  const forecast = point[opt.forecastKey] as number | undefined;
  const isProjected = actual == null && forecast != null;

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs shadow-lg ${
        theme === 'light'
          ? 'bg-white border-zinc-200 text-zinc-900'
          : 'bg-zinc-950 border-zinc-700 text-zinc-100'
      }`}
    >
      <p className="font-semibold mb-1.5">
        {new Date(label).toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
      </p>
      {actual != null && (
        <p className="text-zinc-600 dark:text-zinc-400">
          Actual: <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatMetricValue(metricKey, actual)}</span>
        </p>
      )}
      {forecast != null && (
        <p className={isProjected ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-500'}>
          {isProjected ? 'Projected' : 'Bridge'}:{' '}
          <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatMetricValue(metricKey, forecast)}</span>
        </p>
      )}
    </div>
  );
}

export default function CampaignForecasting() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [forecastDays, setForecastDays] = useState(7);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('spend');
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [historicalCount, setHistoricalCount] = useState(0);
  const [forecastStartDate, setForecastStartDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingReport, setExportingReport] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [backtest, setBacktest] = useState<ForecastBacktest | null>(null);

  useEffect(() => {
    setChartReady(true);
  }, []);

  const fetchForecast = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/forecast?days=${forecastDays}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to calculate forecast.');

      const historical = data.historical || [];
      const forecast = data.forecast || [];
      setHistoricalCount(historical.length);
      setBacktest(data.backtest ?? null);

      if (historical.length === 0) {
        setForecastData([]);
        setForecastStartDate(null);
        setBacktest(null);
        return;
      }

      const bridged = bridgeHistoricalToForecast(historical);
      const lastHistDate = historical[historical.length - 1].date;
      setForecastStartDate(lastHistDate);
      setForecastData([...bridged, ...forecast]);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error loading forecast predictions.');
    } finally {
      setLoading(false);
    }
  }, [token, forecastDays]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const metricConfig = METRIC_OPTIONS.find((m) => m.key === activeMetric)!;
  const lineColor = theme === 'light' ? metricConfig.lightColor : metricConfig.darkColor;
  const forecastEndDate = forecastData.length > 0 ? forecastData[forecastData.length - 1].date : null;

  const tickInterval = useMemo(() => {
    if (forecastData.length <= 10) return 0;
    if (forecastData.length <= 20) return 1;
    return Math.floor(forecastData.length / 8);
  }, [forecastData.length]);

  const handleExportForecastPdf = async () => {
    if (!token || forecastData.length === 0) return;

    try {
      setExportingReport(true);

      const { doc, margin, y: startY } = createExecutivePdf(
        'AdWise AI - Executive Forecast Report',
        `Forecast window: ${forecastDays} days (with ${historicalCount} historical days)`
      );

      let y = startY;
      if (backtest) {
        addSectionTitle(doc, 'Model Backtest (Hold-Out)', margin, y);
        y += 14;
        autoTable(doc, {
          startY: y,
          head: [['Metric', 'Accuracy', 'MAPE', 'RMSE']],
          body: [
            ['Overall', `${Math.round(backtest.overallAccuracy)}%`, `${backtest.overallMape}%`, `${backtest.overallRmse}`],
            ...METRIC_OPTIONS.map((m) => [
              m.label,
              `${Math.round(backtest.byMetric[m.key].accuracy)}%`,
              `${backtest.byMetric[m.key].mape}%`,
              `${backtest.byMetric[m.key].rmse}`,
            ]),
          ],
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 4 },
          headStyles: { fillColor: [39, 39, 42], textColor: [255, 255, 255] },
          margin: { left: margin, right: margin },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      }

      addSectionTitle(doc, '1) Forecast Series (Daily)', margin, y);
      y += 14;

      autoTable(doc, {
        startY: y,
        head: [
          ['Date', 'Spend', 'Clicks', 'Impr.', 'Conv.', 'Fcst $', 'Fcst Clicks', 'Fcst Impr.', 'Fcst Conv.'],
        ],
        body: forecastData.map((p) => [
          new Date(p.date).toISOString().slice(0, 10),
          p.actualSpend != null ? `$${Number(p.actualSpend).toFixed(0)}` : '',
          p.actualClicks != null ? `${Number(p.actualClicks)}` : '',
          p.actualImpressions != null ? `${Number(p.actualImpressions)}` : '',
          p.actualConversions != null ? `${Number(p.actualConversions)}` : '',
          p.forecastSpend != null ? `$${Number(p.forecastSpend).toFixed(0)}` : '',
          p.forecastClicks != null ? `${Number(p.forecastClicks)}` : '',
          p.forecastImpressions != null ? `${Number(p.forecastImpressions)}` : '',
          p.forecastConversions != null ? `${Number(p.forecastConversions)}` : '',
        ]),
        theme: 'striped',
        styles: { fontSize: 7, cellPadding: 4, textColor: [24, 24, 27] },
        headStyles: { fillColor: [39, 39, 42], textColor: [255, 255, 255], fontSize: 7 },
        margin: { left: margin, right: margin },
      });

      doc.save(`adwise-forecast-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      setError('Failed to generate forecast PDF report. Please try again.');
    } finally {
      setExportingReport(false);
    }
  };

  if (loading && forecastData.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col justify-center items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900 dark:text-zinc-100" />
        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Building forecast model...</span>
      </div>
    );
  }

  if (error || forecastData.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col justify-center items-center text-center max-w-md mx-auto space-y-4 px-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 p-4 rounded-full text-zinc-900 dark:text-zinc-100 shadow-xl shadow-zinc-500/5">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">No Forecasting Available</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {error ||
            'Forecasting requires at least 3 days of campaign data. Upload a metrics CSV on the dashboard first.'}
        </p>
      </div>
    );
  }

  const formatChartDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6 md:space-y-8 z-10 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Predictive Forecasting
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
            India & US holiday-aware projections with calendar-gap regression. Pick one metric at a time for a clear view.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
          {backtest && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60"
              title={`Hold-out backtest on last ${backtest.holdoutDays} days · MAPE ${backtest.overallMape}% · RMSE ${backtest.overallRmse}`}
            >
              <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Model accuracy: {Math.round(backtest.overallAccuracy)}%
              </span>
            </div>
          )}

          <button
            onClick={handleExportForecastPdf}
            disabled={exportingReport}
            className="flex items-center gap-2 px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 bg-white/40 dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-60"
          >
            {exportingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            {exportingReport ? 'Generating...' : 'Export PDF'}
          </button>

          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-600 p-1 rounded-xl flex gap-1">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setForecastDays(days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  forecastDays === days
                    ? 'bg-zinc-950 dark:bg-zinc-800 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main chart card */}
      <div className="bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-4 sm:p-6 shadow-sm dark:shadow-none">
        {/* Metric selector + legend */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-300 dark:border-zinc-600">
          <div className="flex flex-wrap gap-1.5">
            {METRIC_OPTIONS.map((m) => {
              const color = theme === 'light' ? m.lightColor : m.darkColor;
              const active = activeMetric === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setActiveMetric(m.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    active
                      ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                      : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded" style={{ backgroundColor: lineColor }} />
              Actual
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded border-t-2 border-dashed" style={{ borderColor: lineColor }} />
              Projected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-zinc-200 dark:bg-zinc-700/80" />
              Forecast zone
            </span>
          </div>
        </div>

        <p className="text-[10px] text-zinc-500 mt-3 mb-1">
          {historicalCount} historical days → {forecastDays} projected days
          {forecastStartDate && (
            <> · forecast starts after {formatChartDate(forecastStartDate)}</>
          )}
          {backtest && (
            <> · backtested on last {backtest.holdoutDays} days (MAPE {backtest.overallMape}%)</>
          )}
        </p>

        {backtest && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {METRIC_OPTIONS.map((m) => {
              const scores = backtest.byMetric[m.key];
              const active = activeMetric === m.key;
              return (
                <div
                  key={m.key}
                  className={`rounded-lg border px-2.5 py-2 text-[10px] ${
                    active
                      ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-50 dark:bg-zinc-800/60'
                      : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30'
                  }`}
                >
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300">{m.label}</p>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    {Math.round(scores.accuracy)}% · MAPE {scores.mape}%
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="w-full min-w-0 mt-2">
          {chartReady && forecastData.length > 0 ? (
            <ResponsiveContainer width="100%" height={420} minWidth={0} debounce={50}>
            <LineChart
              data={forecastData}
              margin={{ top: 16, right: 16, left: 4, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme === 'light' ? '#e4e4e7' : '#3f3f46'}
                vertical={false}
              />

              {forecastStartDate && forecastEndDate && (
                <ReferenceArea
                  x1={forecastStartDate}
                  x2={forecastEndDate}
                  fill={theme === 'light' ? '#f4f4f5' : '#27272a'}
                  fillOpacity={theme === 'light' ? 0.9 : 0.5}
                  ifOverflow="extendDomain"
                />
              )}

              {forecastStartDate && (
                <ReferenceLine
                  x={forecastStartDate}
                  stroke={theme === 'light' ? '#a1a1aa' : '#71717a'}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
              )}

              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                stroke={theme === 'light' ? '#71717a' : '#a1a1aa'}
                tick={{ fontSize: 11 }}
                interval={tickInterval}
                minTickGap={48}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatAxisValue}
                stroke={theme === 'light' ? '#71717a' : '#a1a1aa'}
                tick={{ fontSize: 11 }}
                width={48}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={
                  <ForecastTooltip metricKey={activeMetric} theme={theme} />
                }
              />

              <Line
                type="monotone"
                dataKey={metricConfig.actualKey}
                stroke={lineColor}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey={metricConfig.forecastKey}
                stroke={lineColor}
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeOpacity={0.75}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          )}
        </div>
      </div>

      {/* Explainer cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-zinc-600" /> Calendar-Gap Regression
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Missing weeks in your CSV are counted as real calendar gaps, not skipped steps — so sparse data still trends correctly.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-emerald-500" /> India + US Holidays
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Republic Day, Diwali, Holi, Independence Day, US federal holidays, and more trigger 25% volume dampening on top of weekday patterns.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-emerald-500" /> Hold-Out Backtesting
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            We hide the last N days, retrain the model, and compare predictions to actuals using{' '}
            <strong>MAPE</strong> and <strong>RMSE</strong>. Accuracy = 100% − MAPE — so you know how reliable projections are.
          </p>
        </div>
      </div>
    </div>
  );
}
