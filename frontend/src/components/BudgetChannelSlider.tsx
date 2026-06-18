'use client';

import React from 'react';
import type { ChannelId } from '@/utils/budgetReallocator';

const FILL_CLASS: Record<ChannelId, string> = {
  google: 'bg-zinc-900 dark:bg-zinc-100',
  facebook: 'bg-zinc-600 dark:bg-zinc-300',
  tiktok: 'bg-zinc-400 dark:bg-zinc-500',
};

const DOT_CLASS: Record<ChannelId, string> = {
  google: 'bg-zinc-900 dark:bg-zinc-100',
  facebook: 'bg-zinc-600 dark:bg-zinc-300',
  tiktok: 'bg-zinc-400 dark:bg-zinc-500',
};

interface BudgetChannelSliderProps {
  id: ChannelId;
  label: string;
  value: number;
  spend: number;
  onChange: (id: ChannelId, value: number) => void;
}

export default function BudgetChannelSlider({
  id,
  label,
  value,
  spend,
  onChange,
}: BudgetChannelSliderProps) {
  return (
    <div className="space-y-2.5 group">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-300 group-hover:scale-125 ${DOT_CLASS[id]}`}
          />
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{label}</span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {value.toFixed(1)}%
          </span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block tabular-nums">
            ${spend.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      <div className="relative h-8 flex items-center">
        <div className="absolute inset-x-0 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${FILL_CLASS[id]}`}
            style={{ width: `${value}%` }}
          />
        </div>
        <input
          type="range"
          min={5}
          max={90}
          step={0.5}
          value={value}
          onChange={(e) => onChange(id, Number(e.target.value))}
          className="budget-slider absolute inset-0 w-full h-8 opacity-100 cursor-pointer"
          aria-label={`${label} budget share`}
        />
      </div>
    </div>
  );
}
