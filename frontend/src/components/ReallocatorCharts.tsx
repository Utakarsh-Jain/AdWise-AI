'use client';

import React from 'react';
import type { ChannelId, SimulationMetrics } from '@/utils/budgetReallocator';
import { CHANNELS } from '@/utils/budgetReallocator';

interface ReallocatorChartsProps {
  baseline: SimulationMetrics;
  simulated: SimulationMetrics;
}

function DonutChart({
  title,
  shares,
  size = 140,
}: {
  title: string;
  shares: Record<ChannelId, number>;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const stroke = size * 0.14;
  const circumference = 2 * Math.PI * r;

  const segments = CHANNELS.reduce<{ ch: (typeof CHANNELS)[number]; dash: number; offset: number }[]>(
    (acc, ch) => {
      const dash = (shares[ch.id] / 100) * circumference;
      const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
      acc.push({ ch, dash, offset });
      return acc;
    },
    []
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{title}</p>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth={stroke} />
        {segments.map(({ ch, dash, offset }) => (
          <circle
            key={ch.id}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={ch.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-zinc-900 dark:fill-zinc-100 text-[11px] font-bold">
          Mix
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-zinc-500 text-[8px]">
          100%
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {CHANNELS.map((ch) => (
          <span key={ch.id} className="flex items-center gap-1 text-[9px] text-zinc-600 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ch.color }} />
            {ch.label.split(' ')[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

function MetricBars({
  baseline,
  simulated,
}: {
  baseline: SimulationMetrics;
  simulated: SimulationMetrics;
}) {
  const metrics = [
    {
      label: 'Conversions',
      before: baseline.totalConversions,
      after: simulated.totalConversions,
      format: (v: number) => Math.round(v).toString(),
      higherIsBetter: true,
    },
    {
      label: 'CPA',
      before: baseline.cpa,
      after: simulated.cpa,
      format: (v: number) => `$${v.toFixed(2)}`,
      higherIsBetter: false,
    },
    {
      label: 'ROI',
      before: baseline.roi,
      after: simulated.roi,
      format: (v: number) => `${v.toFixed(1)}%`,
      higherIsBetter: true,
    },
  ];

  const maxVal = Math.max(
    ...metrics.flatMap((m) => [m.before, m.after]),
    1
  );

  return (
    <div className="space-y-4 w-full">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Before vs Simulated</p>
      {metrics.map((m) => {
        const improved =
          m.higherIsBetter ? m.after >= m.before : m.after <= m.before;
        const beforeW = (m.before / maxVal) * 100;
        const afterW = (m.after / maxVal) * 100;

        return (
          <div key={m.label} className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
              <span>{m.label}</span>
              <span className={improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                {m.format(m.before)} → {m.format(m.after)}
              </span>
            </div>
            <svg width="100%" height="28" viewBox="0 0 200 28" preserveAspectRatio="none" className="overflow-visible">
              <rect x="0" y="2" width={beforeW * 2} height="8" rx="4" className="fill-zinc-300 dark:fill-zinc-700 transition-all duration-500" />
              <rect
                x="0"
                y="16"
                width={afterW * 2}
                height="8"
                rx="4"
                className={`transition-all duration-500 ${improved ? 'fill-emerald-500' : 'fill-amber-500'}`}
              />
            </svg>
          </div>
        );
      })}
      <div className="flex gap-4 text-[9px] text-zinc-500 pt-1">
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-zinc-300 dark:bg-zinc-700" /> Current</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-emerald-500" /> Simulated</span>
      </div>
    </div>
  );
}

export default function ReallocatorCharts({ baseline, simulated }: ReallocatorChartsProps) {
  const baselineShares = {
    google: baseline.totalSpend > 0 ? (baseline.channelSpend.google / baseline.totalSpend) * 100 : 0,
    facebook: baseline.totalSpend > 0 ? (baseline.channelSpend.facebook / baseline.totalSpend) * 100 : 0,
    tiktok: baseline.totalSpend > 0 ? (baseline.channelSpend.tiktok / baseline.totalSpend) * 100 : 0,
  };

  const simulatedShares = {
    google: simulated.totalSpend > 0 ? (simulated.channelSpend.google / simulated.totalSpend) * 100 : 0,
    facebook: simulated.totalSpend > 0 ? (simulated.channelSpend.facebook / simulated.totalSpend) * 100 : 0,
    tiktok: simulated.totalSpend > 0 ? (simulated.channelSpend.tiktok / simulated.totalSpend) * 100 : 0,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex justify-around items-start gap-4">
        <DonutChart title="Current Mix" shares={baselineShares} />
        <DonutChart title="Simulated Mix" shares={simulatedShares} />
      </div>
      <MetricBars baseline={baseline} simulated={simulated} />
    </div>
  );
}
