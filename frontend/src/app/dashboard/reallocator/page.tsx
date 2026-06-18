'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import {
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  RotateCcw,
  TrendingUp,
  DollarSign,
  Target,
  Percent,
  Sparkles,
} from 'lucide-react';
import BudgetChannelSlider from '@/components/BudgetChannelSlider';
import ReallocatorCharts from '@/components/ReallocatorCharts';
import {
  CHANNELS,
  type ChannelId,
  type ChannelBaselines,
  buildChannelBaselines,
  sharesFromBaselines,
  adjustShares,
  baselineMetrics,
  simulateAllocation,
} from '@/utils/budgetReallocator';

interface PlatformSummary {
  platform: string;
  totalSpend: number;
  totalConversions: number;
}

export default function BudgetReallocatorPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baselines, setBaselines] = useState<ChannelBaselines | null>(null);
  const [shares, setShares] = useState<Record<ChannelId, number>>({
    google: 34,
    facebook: 33,
    tiktok: 33,
  });
  const [conversionValue, setConversionValue] = useState(85);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load analytics.');

      const platforms: PlatformSummary[] = data.platforms ?? [];
      const totalSpend = Number(data.totalSpend ?? 0);
      if (totalSpend <= 0 || platforms.length === 0) {
        setBaselines(null);
        return;
      }

      const built = buildChannelBaselines(platforms);
      const initialShares = sharesFromBaselines(built);
      setBaselines(built);
      setShares(initialShares);

      const totalConv = Number(data.totalConversions ?? 0);
      if (totalConv > 0 && totalSpend > 0) {
        const impliedValue = (totalSpend / totalConv) * 2.5;
        setConversionValue(Math.round(Math.max(50, impliedValue)));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load reallocator data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const baseline = useMemo(() => {
    if (!baselines) return null;
    return baselineMetrics(baselines, conversionValue);
  }, [baselines, conversionValue]);

  const simulated = useMemo(() => {
    if (!baselines) return null;
    return simulateAllocation(baselines, shares, conversionValue);
  }, [baselines, shares, conversionValue]);

  const handleSliderChange = (id: ChannelId, value: number) => {
    setShares((prev) => adjustShares(prev, id, value));
  };

  const handleReset = () => {
    if (!baselines) return;
    setShares(sharesFromBaselines(baselines));
  };

  const convDelta =
    baseline && simulated
      ? simulated.totalConversions - baseline.totalConversions
      : 0;
  const cpaDelta = baseline && simulated ? baseline.cpa - simulated.cpa : 0;
  const roiDelta = baseline && simulated ? simulated.roi - baseline.roi : 0;

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col justify-center items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900 dark:text-zinc-100" />
        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Loading budget simulator...</span>
      </div>
    );
  }

  if (error || !baselines || !baseline || !simulated) {
    return (
      <div className="h-[60vh] flex flex-col justify-center items-center text-center max-w-md mx-auto space-y-4 px-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 p-4 rounded-full text-zinc-900 dark:text-zinc-100">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">No Data to Simulate</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {error || 'Upload campaign metrics on the dashboard first to unlock the interactive budget reallocator.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 z-10 relative">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-7 h-7" />
            ROI & Budget Reallocator
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Drag sliders to shift spend between Google Ads, Facebook, and TikTok. Conversions, CPA, and ROI update in real time using each channel&apos;s historical efficiency.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-500 bg-white/40 dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition-all self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to Current Mix
        </button>
      </div>

      {/* Live KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Projected Conversions',
            value: Math.round(simulated.totalConversions).toLocaleString(),
            delta: `${convDelta >= 0 ? '+' : ''}${Math.round(convDelta)} vs current`,
            positive: convDelta >= 0,
            icon: Target,
          },
          {
            label: 'Simulated CPA',
            value: `$${simulated.cpa.toFixed(2)}`,
            delta: `${cpaDelta >= 0 ? '-' : '+'}$${Math.abs(cpaDelta).toFixed(2)} vs current`,
            positive: cpaDelta >= 0,
            icon: DollarSign,
          },
          {
            label: 'Projected ROI',
            value: `${simulated.roi.toFixed(1)}%`,
            delta: `${roiDelta >= 0 ? '+' : ''}${roiDelta.toFixed(1)} pts`,
            positive: roiDelta >= 0,
            icon: TrendingUp,
          },
          {
            label: 'Total Budget (fixed)',
            value: `$${simulated.totalSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
            delta: 'Revenue-neutral shift',
            positive: true,
            icon: Percent,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white/80 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-4 backdrop-blur-md shadow-sm dark:shadow-none transition-all duration-300 hover:border-zinc-400 dark:hover:border-zinc-500"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{card.label}</span>
              <card.icon className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-2 tabular-nums">{card.value}</p>
            <p
              className={`text-[10px] font-semibold mt-1 ${
                card.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
              }`}
            >
              {card.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sliders panel */}
        <div className="lg:col-span-5 bg-white/80 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-sm dark:shadow-none space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-300 dark:border-zinc-600">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Channel Allocation</h3>
            <span className="text-[10px] font-bold text-zinc-500 tabular-nums">
              {(shares.google + shares.facebook + shares.tiktok).toFixed(0)}% total
            </span>
          </div>

          <div className="space-y-6">
            {CHANNELS.map((ch) => (
              <BudgetChannelSlider
                key={ch.id}
                id={ch.id}
                label={ch.label}
                color={ch.color}
                value={shares[ch.id]}
                spend={simulated.channelSpend[ch.id]}
                onChange={handleSliderChange}
              />
            ))}
          </div>

          <div className="pt-4 border-t border-zinc-300 dark:border-zinc-600 space-y-2">
            <label htmlFor="conv-value" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              Assumed value per conversion ($)
            </label>
            <input
              id="conv-value"
              type="number"
              min={10}
              max={10000}
              step={5}
              value={conversionValue}
              onChange={(e) => setConversionValue(Math.max(10, Number(e.target.value) || 85))}
              className="w-full text-sm rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950/20 dark:focus:ring-white/10"
            />
            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              ROI = (Conversions × Value − Spend) ÷ Spend
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {CHANNELS.map((ch) => (
              <div
                key={ch.id}
                className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-300 dark:border-zinc-600 rounded-xl p-2.5"
              >
                <p className="text-[9px] text-zinc-500 uppercase font-bold">{ch.label.split(' ')[0]}</p>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tabular-nums mt-0.5">
                  {Math.round(simulated.channelConversions[ch.id])} conv.
                </p>
                <p className="text-[9px] text-zinc-500 tabular-nums">
                  ${baselines[ch.id].efficiency > 0 ? (1 / baselines[ch.id].efficiency).toFixed(2) : '—'} CPA est.
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Charts panel */}
        <div className="lg:col-span-7 bg-white/80 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-sm dark:shadow-none">
          <div className="pb-4 border-b border-zinc-300 dark:border-zinc-600 mb-6">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Live Simulation Charts</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">SVG visuals update as you drag each slider</p>
          </div>
          <ReallocatorCharts baseline={baseline} simulated={simulated} />
        </div>
      </div>
    </div>
  );
}
