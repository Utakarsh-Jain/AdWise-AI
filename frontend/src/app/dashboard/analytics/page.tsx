'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Loader2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingDown,
  Sparkles,
  Zap,
  Globe,
  Video
} from 'lucide-react';

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

interface CampaignSummary {
  campaignId: string;
  campaignName: string;
  platform: string;
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  totalConversions: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  cpa: number;
  performanceScore: number;
}

interface PlatformSummary {
  platform: string;
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  totalConversions: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  cpa: number;
  shareOfSpend: number;
}

interface BudgetReallocation {
  campaignId: string;
  campaignName: string;
  platform: string;
  currentSpend: number;
  currentConversions: number;
  efficiency: number;
  recommendedSpend: number;
  changeAmount: number;
  changePercentage: number;
  expectedConversions: number;
}

interface OptimizationResult {
  totalCurrentSpend: number;
  totalRecommendedSpend: number;
  expectedTotalConversionsBefore: number;
  expectedTotalConversionsAfter: number;
  conversionsLiftPercentage: number;
  reallocations: BudgetReallocation[];
}

export default function CampaignAnalytics() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [platforms, setPlatforms] = useState<PlatformSummary[]>([]);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch campaign analytics and budget optimization data
  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch analytics
      const anaRes = await fetch(`${API_BASE_URL}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const anaData = await anaRes.json();
      if (!anaRes.ok) throw new Error(anaData.error || 'Failed to load analytics.');

      setCampaigns(anaData.campaigns);
      setPlatforms(anaData.platforms);

      // 2. Fetch budget optimizations
      const optRes = await fetch(`${API_BASE_URL}/budget-optimization`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const optData = await optRes.json();
      if (!optRes.ok) throw new Error(optData.error || 'Failed to load optimizations.');

      setOptimization(optData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load campaign data. Have you uploaded a CSV file?');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Color palette for platforms
  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('google')) return <Globe className="w-4 h-4 text-sky-400" />;
    if (p.includes('meta') || p.includes('facebook') || p.includes('instagram')) return <FacebookIcon className="w-4 h-4 text-blue-500" />;
    if (p.includes('tiktok')) return <Video className="w-4 h-4 text-rose-400" />;
    return <Sparkles className="w-4 h-4 text-indigo-400" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 50) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col justify-center items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-slate-400 font-medium">Computing analytics dashboards...</span>
      </div>
    );
  }

  if (error || campaigns.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col justify-center items-center text-center max-w-md mx-auto space-y-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-full text-indigo-400 shadow-xl shadow-indigo-500/5">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-200">No Analytics Available</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {error || 'Please upload a marketing metrics CSV file on the main overview dashboard first to populate these analytics.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 z-10 relative">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
          Campaign Analytics
        </h1>
        <p className="text-slate-400 mt-1">
          Detailed platform comparisons and custom algorithmic budget reallocation models.
        </p>
      </div>

      {/* Platform Performance Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table summary of Platforms */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between backdrop-blur-md">
          <div className="pb-4 border-b border-slate-900">
            <h3 className="text-sm font-bold text-slate-200">Platform Performance Shares</h3>
            <p className="text-[10px] text-slate-500">Aggregated spend, CPA, and ROI comparison</p>
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2">Platform</th>
                  <th className="py-3 px-2 text-right">Spend Share</th>
                  <th className="py-3 px-2 text-right">Conversions</th>
                  <th className="py-3 px-2 text-right">Avg CTR</th>
                  <th className="py-3 px-2 text-right">Avg CPC</th>
                  <th className="py-3 px-2 text-right">Avg CPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/50 text-slate-300">
                {platforms.map((p) => (
                  <tr key={p.platform} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-3 px-2 font-bold flex items-center gap-2 text-slate-200">
                      {getPlatformIcon(p.platform)}
                      {p.platform}
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-slate-400">
                      {p.shareOfSpend.toFixed(1)}% <span className="text-[10px] text-slate-600">(${Math.round(p.totalSpend)})</span>
                    </td>
                    <td className="py-3 px-2 text-right font-semibold text-slate-200">{p.totalConversions}</td>
                    <td className="py-3 px-2 text-right font-medium text-slate-400">{p.ctr.toFixed(2)}%</td>
                    <td className="py-3 px-2 text-right font-medium text-slate-400">${p.cpc.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right font-bold text-indigo-400">${p.cpa.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform Share of Voice Bar Chart */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md h-[270px] lg:h-auto">
          <div className="pb-4 border-b border-slate-900">
            <h3 className="text-sm font-bold text-slate-200">CPA Comparison</h3>
            <p className="text-[10px] text-slate-500">Lower Cost Per Acquisition is superior</p>
          </div>
          <div className="flex-1 mt-6 text-xs min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platforms} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b/40" vertical={false} />
                <XAxis dataKey="platform" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'CPA ($)']}
                />
                <Bar dataKey="cpa" fill="#6366f1" radius={[8, 8, 0, 0]}>
                  {platforms.map((entry, index) => {
                    const colors = ['#6366f1', '#10b981', '#ec4899', '#f59e0b'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Campaign Efficiency Rankings */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
        <div className="pb-4 border-b border-slate-900">
          <h3 className="text-sm font-bold text-slate-200">Campaign Performance & Rankings</h3>
          <p className="text-[10px] text-slate-500">Ranked by our proprietary, balanced performance scoring algorithm</p>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">Campaign Name</th>
                <th className="py-3 px-2">Platform</th>
                <th className="py-3 px-2 text-right">Spend</th>
                <th className="py-3 px-2 text-right">Conversions</th>
                <th className="py-3 px-2 text-right">CTR</th>
                <th className="py-3 px-2 text-right">CPC</th>
                <th className="py-3 px-2 text-right">CPA</th>
                <th className="py-3 px-2 text-center">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50 text-slate-300">
              {campaigns.map((c) => (
                <tr key={c.campaignId} className="hover:bg-slate-900/20 transition-colors">
                  <td className="py-3 px-2 font-bold text-slate-200">{c.campaignName}</td>
                  <td className="py-3 px-2 font-medium text-slate-400">{c.platform}</td>
                  <td className="py-3 px-2 text-right font-medium text-slate-400">${c.totalSpend.toFixed(2)}</td>
                  <td className="py-3 px-2 text-right font-semibold text-slate-200">{c.totalConversions}</td>
                  <td className="py-3 px-2 text-right font-medium text-slate-400">{c.ctr.toFixed(2)}%</td>
                  <td className="py-3 px-2 text-right font-medium text-slate-400">${c.cpc.toFixed(2)}</td>
                  <td className="py-3 px-2 text-right font-semibold text-slate-200">${c.cpa.toFixed(2)}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getScoreColor(c.performanceScore)}`}>
                      {c.performanceScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget Optimization Engine (SDE Algorithm) */}
      {optimization && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Stats */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400 animate-pulse" /> Algorithmic Optimization
              </span>
              <h2 className="text-3xl font-extrabold text-slate-100 flex items-baseline gap-1">
                +{optimization.conversionsLiftPercentage}%
                <span className="text-xs font-semibold text-emerald-400 flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Conversions Lift
                </span>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                By shifting 15% budget away from campaigns with below-average efficiency, we can purchase higher-value placements.
              </p>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Current Leads</p>
                  <p className="text-lg font-bold text-slate-200 mt-0.5">{optimization.expectedTotalConversionsBefore}</p>
                </div>
                <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl border-l-2 border-l-emerald-500">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Optimized Leads</p>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">{optimization.expectedTotalConversionsAfter}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-900 text-[10px] text-slate-500 font-semibold uppercase">
              *Net-Neutral Budget (No extra cost)
            </div>
          </div>

          {/* Reallocations Grid */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between backdrop-blur-md">
            <div className="pb-4 border-b border-slate-900">
              <h3 className="text-sm font-bold text-slate-200">Reallocation Suggestions</h3>
              <p className="text-[10px] text-slate-500">Recommended budget changes and expected performance shift</p>
            </div>
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-2">Campaign</th>
                    <th className="py-3 px-2 text-right">Current Spend</th>
                    <th className="py-3 px-2 text-right">Optimized Spend</th>
                    <th className="py-3 px-2 text-right">Change ($)</th>
                    <th className="py-3 px-2 text-right">Expected Lift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/50 text-slate-300">
                  {optimization.reallocations.map((r) => {
                    const isPositive = r.changeAmount > 0;
                    return (
                      <tr key={r.campaignId} className="hover:bg-slate-900/20 transition-colors">
                        <td className="py-3 px-2 font-bold text-slate-200">
                          {r.campaignName}
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-slate-400">${r.currentSpend.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right font-semibold text-slate-200">${r.recommendedSpend.toFixed(2)}</td>
                        <td className={`py-3 px-2 text-right font-bold flex items-center justify-end gap-0.5 ${isPositive ? 'text-emerald-400' : r.changeAmount === 0 ? 'text-slate-500' : 'text-rose-400'}`}>
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : r.changeAmount === 0 ? null : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          ${Math.abs(r.changeAmount).toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-indigo-400">
                          {r.currentConversions} → {r.expectedConversions}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
