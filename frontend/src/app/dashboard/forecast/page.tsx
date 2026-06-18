'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  Loader2, 
  AlertCircle, 
  Calendar,
  Sparkles,
  BarChart4,
  LineChart as LineChartIcon,
  FileDown
} from 'lucide-react';
import autoTable from 'jspdf-autotable';
import { createExecutivePdf, addSectionTitle } from '@/utils/pdfReport';

interface ForecastPoint {
  date: string;
  actualSpend?: number;
  actualConversions?: number;
  forecastSpend?: number;
  forecastConversions?: number;
}

interface ForecastResult {
  historical: ForecastPoint[];
  forecast: ForecastPoint[];
}

export default function CampaignForecasting() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [forecastDays, setForecastDays] = useState(7);
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [historicalCount, setHistoricalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingReport, setExportingReport] = useState(false);

  // Fetch forecast data from API
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

      if (historical.length === 0) {
        setForecastData([]);
        return;
      }

      // Merge historical and forecast into a continuous series.
      // To connect them, we copy the last historical point's values
      // into the first forecast point's forecast values
      const merged: ForecastPoint[] = [...historical];
      const lastHist = historical[historical.length - 1];

      const connectedForecast = forecast.map((f: any, idx: number) => {
        if (idx === 0) {
          return {
            ...f,
            forecastSpend: f.forecastSpend ?? lastHist.actualSpend,
            forecastConversions: f.forecastConversions ?? lastHist.actualConversions,
          };
        }
        return f;
      });

      setForecastData([...merged, ...connectedForecast]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading forecast predictions.');
    } finally {
      setLoading(false);
    }
  }, [token, forecastDays]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const handlePeriodChange = (days: number) => {
    setForecastDays(days);
  };

  const handleExportForecastPdf = async () => {
    if (!token || forecastData.length === 0) return;

    try {
      setExportingReport(true);

      const { doc, margin, y: startY } = createExecutivePdf(
        'AdWise AI - Executive Forecast Report',
        `Forecast window: ${forecastDays} days (with ${historicalCount} historical days)`
      );

      let y = startY;
      addSectionTitle(doc, '1) Forecast Series (Daily)', margin, y);
      y += 14;

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Actual Spend', 'Actual Conversions', 'Forecast Spend', 'Forecast Conversions']],
        body: forecastData.map((p) => [
          new Date(p.date).toISOString().slice(0, 10),
          p.actualSpend != null ? `$${Number(p.actualSpend).toFixed(2)}` : '',
          p.actualConversions != null ? `${Number(p.actualConversions)}` : '',
          p.forecastSpend != null ? `$${Number(p.forecastSpend).toFixed(2)}` : '',
          p.forecastConversions != null ? `${Number(p.forecastConversions)}` : '',
        ]),
        theme: 'striped',
        styles: { fontSize: 8.5, cellPadding: 5, textColor: [24, 24, 27] },
        headStyles: { fillColor: [39, 39, 42], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      const reportDate = new Date().toISOString().slice(0, 10);
      doc.save(`adwise-forecast-report-${reportDate}.pdf`);
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
        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Running Linear Regression projections...</span>
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
          {error || 'Forecasting requires historical campaign data. Please upload a marketing metrics CSV on the main overview dashboard first.'}
        </p>
      </div>
    );
  }

  // Format date strings for chart labels
  const formatChartDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 md:space-y-8 z-10 relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            Predictive Forecasting
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Data projections powered by a blended Linear Regression and Moving Average algorithm.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start">
          <button
            onClick={handleExportForecastPdf}
            disabled={exportingReport}
            className="flex items-center gap-2 px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-500 bg-white/40 dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl text-xs font-semibold transition-all disabled:opacity-60"
          >
            {exportingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            {exportingReport ? 'Generating PDF...' : 'Export PDF'}
          </button>

          {/* Period Selector Buttons */}
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-600 p-1 rounded-xl flex items-center gap-1 backdrop-blur-md">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => handlePeriodChange(days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                  forecastDays === days
                    ? 'bg-zinc-950 dark:bg-zinc-800 text-white shadow-md'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {days} Days Out
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Projections LineChart */}
      <div className="bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-4 sm:p-6 flex flex-col justify-between backdrop-blur-md h-[320px] sm:h-[450px] shadow-sm dark:shadow-none transition-colors">
        <div className="flex justify-between items-center pb-4 border-b border-zinc-300 dark:border-zinc-600">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Spend & Conversions Projections</h3>
            <p className="text-[10px] text-zinc-500">
              Showing {historicalCount} historical days + {forecastDays} projected days (dashed lines)
            </p>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-lg border border-zinc-300/40 dark:border-zinc-600/50 text-zinc-500 dark:text-zinc-400">
            <LineChartIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 mt-6 text-[10px] sm:text-xs min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#e2e8f0' : '#1e293b/40'} vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatChartDate} stroke={theme === 'light' ? '#71717a' : '#a1a1aa'} />
              <YAxis yAxisId="left" stroke={theme === 'light' ? '#18181b' : '#ffffff'} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'light' ? '#ffffff' : '#09090b', 
                  borderColor: theme === 'light' ? '#e4e4e7' : '#27272a',
                  color: theme === 'light' ? '#18181b' : '#f4f4f5', 
                  borderRadius: '12px' 
                }} 
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              {/* Historical Lines */}
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="actualSpend" 
                name="Historical Spend ($)" 
                stroke={theme === 'light' ? '#18181b' : '#ffffff'} 
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="actualConversions" 
                name="Historical Conversions" 
                stroke="#10b981" 
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              {/* Forecast Projections Lines */}
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="forecastSpend" 
                name="Projected Spend ($)" 
                stroke={theme === 'light' ? '#71717a' : '#a1a1aa'} 
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 0 }}
                connectNulls
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="forecastConversions" 
                name="Projected Conversions" 
                stroke="#10b981" 
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 0 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SDE Explainer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden shadow-sm dark:shadow-none transition-colors">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-zinc-600" /> Linear Regression Model
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              We calculate the trend lines using the <strong>Least Squares Method</strong>. This maps historical dates as indexes ($x$) and solves $y = mx + c$ to identify performance trends.
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-300 dark:border-zinc-600 p-4 rounded-xl font-mono text-[11px] text-zinc-800 dark:text-zinc-300 space-y-1">
              <p className="font-semibold text-zinc-500">// Least Squares Formula</p>
              <p>slope (m) = Sum((x - meanX) * (y - meanY)) / Sum((x - meanX)^2)</p>
              <p>intercept (c) = meanY - slope * meanX</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden shadow-sm dark:shadow-none transition-colors">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Blended Moving Average
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              To account for short-term volume stability and prevent wild trend lines, our forecasting model blends the Linear Regression outputs (70% weight) with a trailing 7-day Simple Moving Average (30% weight).
            </p>
            <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span>Prevents negative predictions on down-trending spend.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span>Smooths out weekend dips in campaign engagement.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
