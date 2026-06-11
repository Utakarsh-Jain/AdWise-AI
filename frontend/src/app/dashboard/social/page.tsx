'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Share2, TrendingUp, Clock, Calendar, Loader2, AlertCircle,
  RefreshCw, Sparkles, Lightbulb, Target, Zap, Hash, Activity,
  BarChart2, MessageSquare, Heart, Eye, Link2
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import Link from 'next/link';

interface SocialAnalytics {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalImpressions: number;
  totalReach: number;
  avgEngagementRate: number;
  bestPostingHour: number;
  bestPostingHourScore: number;
  lowestPostingHour: number;
  lowestPostingHourScore: number;
  bestPostingDay: number;
  bestPostingDayScore: number;
  contentTypeComparison: Array<{ type: string; avgEngagementRate: number; count: number }>;
  hourlyEngagement: Array<{ hour: number; engagementRate: number }>;
  dailyEngagement: Array<{ day: number; dayName: string; engagementRate: number }>;
  monthlyGrowth: Array<{ month: string; impressions: number; reach: number; posts: number }>;
  topicPerformance: Array<{ topic: string; avgEngagementRate: number; count: number }>;
}

interface Recommendations {
  nextBestPostingTime: string;
  recommendedContentType: string;
  suggestedHashtagCount: number;
  suggestedPostingFrequency: string;
  reasoning: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CONTENT_COLORS: Record<string, string> = {
  REEL: '#8b5cf6',
  IMAGE: '#3b82f6',
  VIDEO: '#10b981',
  CAROUSEL: '#f59e0b',
};

export default function SocialDashboard() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [analytics, setAnalytics] = useState<SocialAnalytics | null>(null);
  const [insights, setInsights] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#1e293b' : '#e2e8f0',
    color: isDark ? '#cbd5e1' : '#1e293b',
    borderRadius: '12px',
    fontSize: '11px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };
  const gridStroke = isDark ? '#1e293b' : '#f1f5f9';
  const axisStroke = isDark ? '#475569' : '#94a3b8';

  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setInsightsLoading(true);
      setError(null);

      const [analyticsRes, insightsRes, recRes] = await Promise.all([
        fetch(`${API_BASE_URL}/social/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/social/insights`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/social/recommendations`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [analyticsData, insightsData, recData] = await Promise.all([
        analyticsRes.json(),
        insightsRes.json(),
        recRes.json(),
      ]);

      if (!analyticsRes.ok) throw new Error(analyticsData.error || 'Failed to load social analytics.');
      setAnalytics(analyticsData);

      if (insightsRes.ok) setInsights(insightsData.insights);
      if (recRes.ok) setRecommendations(recData);
    } catch (err: any) {
      setError(err.message || 'Error loading social dashboard.');
    } finally {
      setLoading(false);
      setInsightsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const parseMarkdownInsights = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('### ')) return (
        <h3 key={i} className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-4 mb-2 transition-colors">{line.replace('### ', '')}</h3>
      );
      if (line.trim().startsWith('- ')) {
        const cleaned = line.trim().replace(/^-\s*/, '');
        const parts = cleaned.split(/\*\*(.*?)\*\*/g).map((part, j) =>
          j % 2 === 1 ? <strong key={j} className="font-bold text-slate-800 dark:text-slate-200">{part}</strong> : part
        );
        return (
          <div key={i} className="flex items-start gap-2.5 py-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{parts}</p>
          </div>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-1" />;
      const parts = line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
        j % 2 === 1 ? <strong key={j} className="font-bold text-slate-800 dark:text-slate-200">{part}</strong> : part
      );
      return <p key={i} className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed py-0.5">{parts}</p>;
    });
  };

  const isEmpty = !analytics || analytics.totalPosts === 0;

  // Skeleton loader for cards
  if (loading && !analytics) {
    return (
      <div className="space-y-8 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="w-48 h-7 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 z-10 relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2.5 transition-colors">
            <Share2 className="w-8 h-8 text-indigo-500" />
            Social Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 transition-colors">
            AI-powered social media analytics, engagement insights, and content recommendations.
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/80 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-300">Error</h4>
            <p className="text-xs text-rose-400/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && !loading && (
        <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-16 text-center backdrop-blur-md">
          <div className="inline-flex items-center justify-center p-5 rounded-full bg-indigo-500/10 text-indigo-400 mb-6">
            <Share2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">No Social Data Yet</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
            Connect your Instagram, Facebook, or LinkedIn accounts to start syncing posts and generating AI-powered engagement analytics.
          </p>
          <Link
            href="/dashboard/accounts"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            <Link2 className="w-4 h-4" />
            Connect Accounts
          </Link>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* ── KPI Cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Posts */}
            <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-2xl p-6 transition-all duration-300 group hover:-translate-y-0.5 backdrop-blur-md shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Posts</span>
                <div className="bg-indigo-100 dark:bg-indigo-500/10 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <BarChart2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics!.totalPosts}</h2>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">{analytics!.totalImpressions.toLocaleString()} impressions total</p>
              </div>
            </div>

            {/* Avg Engagement Rate */}
            <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-2xl p-6 transition-all duration-300 group hover:-translate-y-0.5 backdrop-blur-md shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Engagement</span>
                <div className="bg-emerald-100 dark:bg-emerald-500/10 p-2 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics!.avgEngagementRate}%</h2>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">(likes + comments + shares) / impressions</p>
              </div>
            </div>

            {/* Best Posting Time */}
            <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-2xl p-6 transition-all duration-300 group hover:-translate-y-0.5 backdrop-blur-md shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Best Posting Time</span>
                <div className="bg-amber-100 dark:bg-amber-500/10 p-2 rounded-xl text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {analytics!.bestPostingHour}:00
                  <span className="text-xs font-semibold text-slate-400 ml-1">{analytics!.bestPostingHour < 12 ? 'AM' : 'PM'}</span>
                </h2>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">ER: {analytics!.bestPostingHourScore}%</p>
              </div>
            </div>

            {/* Best Posting Day */}
            <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-2xl p-6 transition-all duration-300 group hover:-translate-y-0.5 backdrop-blur-md shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Best Posting Day</span>
                <div className="bg-purple-100 dark:bg-purple-500/10 p-2 rounded-xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{DAY_NAMES[analytics!.bestPostingDay]}</h2>
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">ER: {analytics!.bestPostingDayScore}%</p>
              </div>
            </div>
          </div>

          {/* ── Charts Row 1 ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement by Day */}
            <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-sm transition-colors">
              <div className="mb-5 border-b border-slate-200 dark:border-slate-900 pb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Engagement by Day of Week</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Avg engagement rate per weekday</p>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics!.dailyEngagement} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="dayName" stroke={axisStroke} tick={{ fontSize: 10 }}
                      tickFormatter={v => v.slice(0, 3)} />
                    <YAxis stroke={axisStroke} tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, 'Engagement Rate']} />
                    <Bar dataKey="engagementRate" name="Engagement %" radius={[6, 6, 0, 0]}
                      fill="url(#colorDay)" />
                    <defs>
                      <linearGradient id="colorDay" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Engagement by Hour */}
            <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-sm transition-colors">
              <div className="mb-5 border-b border-slate-200 dark:border-slate-900 pb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Engagement by Hour</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">24-hour engagement rate distribution</p>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics!.hourlyEngagement} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="hour" stroke={axisStroke} tick={{ fontSize: 10 }}
                      tickFormatter={h => `${h}h`} />
                    <YAxis stroke={axisStroke} tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, 'Engagement Rate']}
                      labelFormatter={l => `Hour: ${l}:00`} />
                    <Line type="monotone" dataKey="engagementRate" stroke="#10b981" strokeWidth={2.5}
                      dot={false} activeDot={{ r: 5, fill: '#10b981' }} name="ER %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Charts Row 2 ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Content Type Comparison */}
            <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-sm transition-colors">
              <div className="mb-5 border-b border-slate-200 dark:border-slate-900 pb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Content Type Performance</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Average engagement rate by media format</p>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics!.contentTypeComparison} layout="vertical"
                    margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                    <XAxis type="number" stroke={axisStroke} tick={{ fontSize: 10 }} unit="%" />
                    <YAxis dataKey="type" type="category" stroke={axisStroke} tick={{ fontSize: 11 }} width={72} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, 'Avg ER']} />
                    <Bar dataKey="avgEngagementRate" name="Avg ER %" radius={[0, 6, 6, 0]}>
                      {analytics!.contentTypeComparison.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={CONTENT_COLORS[entry.type] || '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Content type legend pills */}
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-900">
                {analytics!.contentTypeComparison.map(c => (
                  <span key={c.type} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CONTENT_COLORS[c.type] }} />
                    {c.type} ({c.count})
                  </span>
                ))}
              </div>
            </div>

            {/* Monthly Growth */}
            <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-sm transition-colors">
              <div className="mb-5 border-b border-slate-200 dark:border-slate-900 pb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Monthly Growth</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Impressions and Reach over time</p>
              </div>
              <div className="h-52">
                {analytics!.monthlyGrowth.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">Not enough data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics!.monthlyGrowth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorImpr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="month" stroke={axisStroke} tick={{ fontSize: 10 }} />
                      <YAxis stroke={axisStroke} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend verticalAlign="top" height={32} iconType="circle" />
                      <Line type="monotone" dataKey="impressions" stroke="#6366f1" strokeWidth={2} dot={false}
                        name="Impressions" />
                      <Line type="monotone" dataKey="reach" stroke="#f59e0b" strokeWidth={2} dot={false}
                        name="Reach" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* ── AI Insights + Recommendations ─────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Insights */}
            <div className="lg:col-span-2 bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 backdrop-blur-md shadow-sm relative overflow-hidden transition-colors">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2.5 mb-6">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">AI Insights</h3>
                  <p className="text-[10px] text-slate-500">Powered by Gemini · Social Pattern Analysis</p>
                </div>
              </div>

              {insightsLoading ? (
                <div className="flex items-center gap-3 py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-xs text-slate-500">Generating AI insights...</span>
                </div>
              ) : insights ? (
                <div className="space-y-1">{parseMarkdownInsights(insights)}</div>
              ) : (
                <p className="text-xs text-slate-500">No insights available. Connect and sync social accounts first.</p>
              )}
            </div>

            {/* Recommendations */}
            <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-sm transition-colors space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 dark:bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recommendations</h3>
                  <p className="text-[10px] text-slate-500">Strategic action items</p>
                </div>
              </div>

              {recommendations ? (
                <div className="space-y-4">
                  <RecommendationItem
                    icon={<Clock className="w-4 h-4" />}
                    label="Next Best Time"
                    value={recommendations.nextBestPostingTime}
                    color="indigo"
                  />
                  <RecommendationItem
                    icon={<Zap className="w-4 h-4" />}
                    label="Recommended Format"
                    value={recommendations.recommendedContentType}
                    color="purple"
                  />
                  <RecommendationItem
                    icon={<Hash className="w-4 h-4" />}
                    label="Hashtag Count"
                    value={`${recommendations.suggestedHashtagCount} tags per post`}
                    color="emerald"
                  />
                  <RecommendationItem
                    icon={<Calendar className="w-4 h-4" />}
                    label="Posting Frequency"
                    value={recommendations.suggestedPostingFrequency}
                    color="amber"
                  />

                  {recommendations.reasoning && (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-900">
                      <p className="text-[10px] text-slate-500 leading-relaxed">{recommendations.reasoning}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sync social posts to receive personalized recommendations.
                </p>
              )}
            </div>
          </div>

          {/* ── Engagement Stats Summary ───────────────────────────── */}
          <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-sm transition-colors">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6">Engagement Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { icon: <Heart className="w-4 h-4" />, label: 'Total Likes', value: analytics!.totalLikes.toLocaleString(), color: 'rose' },
                { icon: <MessageSquare className="w-4 h-4" />, label: 'Comments', value: analytics!.totalComments.toLocaleString(), color: 'blue' },
                { icon: <Share2 className="w-4 h-4" />, label: 'Shares', value: analytics!.totalShares.toLocaleString(), color: 'emerald' },
                { icon: <Eye className="w-4 h-4" />, label: 'Total Reach', value: analytics!.totalReach.toLocaleString(), color: 'amber' },
              ].map(stat => (
                <div key={stat.label} className="text-center space-y-2">
                  <div className={`inline-flex items-center justify-center p-2.5 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-500/10 text-${stat.color}-500`}>
                    {stat.icon}
                  </div>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stat.value}</p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RecommendationItem({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    purple: 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-xl shrink-0 ${colorMap[color]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 leading-snug">{value}</p>
      </div>
    </div>
  );
}
