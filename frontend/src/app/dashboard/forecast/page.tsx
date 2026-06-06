'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
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
  LineChart as LineChartIcon
} from 'lucide-react';

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
  const [forecastDays, setForecastDays] = useState(7);
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [historicalCount, setHistoricalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading && forecastData.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col justify-center items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-slate-400 font-medium">Running Linear Regression projections...</span>
      </div>
    );
  }

  if (error || forecastData.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col justify-center items-center text-center max-w-md mx-auto space-y-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-full text-indigo-400 shadow-xl shadow-indigo-500/5">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-200">No Forecasting Available</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
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
    <div className="space-y-8 z-10 relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            Predictive Forecasting
          </h1>
          <p className="text-slate-400 mt-1">
            Data projections powered by a blended Linear Regression and Moving Average algorithm.
          </p>
        </div>

        {/* Period Selector Buttons */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-1 rounded-xl flex items-center gap-1 backdrop-blur-md self-start">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => handlePeriodChange(days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                forecastDays === days
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {days} Days Out
            </button>
          ))}
        </div>
      </div>

      {/* Main Projections LineChart */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md h-[450px]">
        <div className="flex justify-between items-center pb-4 border-b border-slate-900">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Spend & Conversions Projections</h3>
            <p className="text-[10px] text-slate-500">
              Showing {historicalCount} historical days + {forecastDays} projected days (dashed lines)
            </p>
          </div>
          <div className="bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/30 text-slate-400">
            <LineChartIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 mt-6 text-xs min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b/40" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatChartDate} stroke="#64748b" />
              <YAxis yAxisId="left" stroke="#4f46e5" />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#1e293b', 
                  color: '#cbd5e1', 
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
                stroke="#4f46e5" 
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
                stroke="#4f46e5" 
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
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> Linear Regression Model
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We calculate the trend lines using the <strong>Least Squares Method</strong>. This maps historical dates as indexes ($x$) and solves $y = mx + c$ to identify performance trends.
            </p>
            <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl font-mono text-[11px] text-slate-300 space-y-1">
              <p className="font-semibold text-indigo-400">// Least Squares Formula</p>
              <p>slope (m) = Sum((x - meanX) * (y - meanY)) / Sum((x - meanX)^2)</p>
              <p>intercept (c) = meanY - slope * meanX</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" /> Blended Moving Average
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              To account for short-term volume stability and prevent wild trend lines, our forecasting model blends the Linear Regression outputs (70% weight) with a trailing 7-day Simple Moving Average (30% weight).
            </p>
            <ul className="space-y-1.5 text-xs text-slate-400">
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
