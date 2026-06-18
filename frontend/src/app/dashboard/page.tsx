'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { 
  DollarSign, 
  Target, 
  Percent, 
  TrendingUp, 
  UploadCloud, 
  FileSpreadsheet, 
  Download,
  FileDown,
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  BarChart2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import autoTable from 'jspdf-autotable';
import { createExecutivePdf, addSectionTitle } from '@/utils/pdfReport';

interface AggregatedMetrics {
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  totalConversions: number;
  avgCtr: number;
  avgCpc: number;
  avgConversionRate: number;
  avgCpa: number;
  overallScore: number;
  campaigns: any[];
}

export default function DashboardOverview() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingReport, setExportingReport] = useState(false);

  // CSV Upload States
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgressMsg, setJobProgressMsg] = useState<string | null>(null);

  // Chart Data State
  const [chartData, setChartData] = useState<any[]>([]);

  // Fetch all analytics data
  const fetchAnalytics = useCallback(async (bypassCache = false) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/analytics?bypassCache=${bypassCache}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch analytics.');
      setMetrics(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch campaign metrics for charts
  const fetchCampaigns = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch campaigns.');
      
      // Process date aggregation
      const dailyMap = new Map<string, { spend: number; conversions: number; clicks: number }>();
      
      data.forEach((camp: any) => {
        camp.metrics.forEach((m: any) => {
          const dateStr = new Date(m.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          const existing = dailyMap.get(dateStr) || { spend: 0, conversions: 0, clicks: 0 };
          existing.spend += m.spend;
          existing.conversions += m.conversions;
          existing.clicks += m.clicks;
          dailyMap.set(dateStr, existing);
        });
      });

      const formattedData = Array.from(dailyMap.entries()).map(([date, vals]) => ({
        date,
        spend: parseFloat(vals.spend.toFixed(2)),
        conversions: vals.conversions,
        clicks: vals.clicks,
      })).slice(-14); // Last 14 days

      setChartData(formattedData);
    } catch (err) {
      console.error('Failed to load chart metrics:', err);
    }
  }, [token]);

  const loadData = useCallback(async () => {
    await fetchAnalytics();
    await fetchCampaigns();
  }, [fetchAnalytics, fetchCampaigns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll job status until completed/failed
  useEffect(() => {
    if (!jobId || !token) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const job = await res.json();
        
        if (!res.ok) throw new Error(job.error || 'Failed to poll job status.');

        setJobStatus(job.status);
        if (job.status === 'PROCESSING') {
          setJobProgressMsg('Ingesting and validating campaign data...');
        } else if (job.status === 'COMPLETED') {
          setJobProgressMsg(`Successfully processed ${job.validRows} rows!`);
          clearInterval(interval);
          setUploading(false);
          setJobId(null);
          // Refresh dashboard data
          await fetchAnalytics(true); // Bypass cache to load new data
          await fetchCampaigns();
          setTimeout(() => {
            setJobStatus(null);
            setJobProgressMsg(null);
          }, 4000);
        } else if (job.status === 'FAILED') {
          setError(job.error || 'Database ingestion failed.');
          clearInterval(interval);
          setUploading(false);
          setJobId(null);
          setTimeout(() => {
            setJobStatus(null);
            setJobProgressMsg(null);
          }, 5000);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error checking background import status.');
        clearInterval(interval);
        setUploading(false);
        setJobId(null);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobId, token, fetchAnalytics, fetchCampaigns]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setError(null);
    setUploading(true);
    setJobStatus('PENDING');
    setJobProgressMsg('Uploading file to backend ingestion pipeline...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'File upload failed.');
      }

      setJobId(data.jobId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'File upload failed.');
      setUploading(false);
      setJobStatus(null);
      setJobProgressMsg(null);
    }
  };

  const handleExportDashboardPdf = async () => {
    if (!token || !metrics) return;

    try {
      setExportingReport(true);

      const { doc, margin, y: startY } = createExecutivePdf(
        'AdWise AI - Executive Dashboard Report',
        `User: ${user?.name ?? 'Unknown'}`
      );

      let y = startY;
      addSectionTitle(doc, '1) KPI Snapshot', margin, y);
      y += 14;

      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Total Spend', `$${Number(metrics.totalSpend).toFixed(2)}`],
          ['Total Clicks', `${Number(metrics.totalClicks)}`],
          ['Total Impressions', `${Number(metrics.totalImpressions)}`],
          ['Total Conversions', `${Number(metrics.totalConversions)}`],
          ['Avg CTR', `${Number(metrics.avgCtr).toFixed(2)}%`],
          ['Avg CPC', `$${Number(metrics.avgCpc).toFixed(2)}`],
          ['Avg Conversion Rate', `${Number(metrics.avgConversionRate).toFixed(2)}%`],
          ['Avg CPA', `$${Number(metrics.avgCpa).toFixed(2)}`],
          ['Overall Score', `${Math.round(Number(metrics.overallScore))}/100`],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 6, textColor: [24, 24, 27] },
        headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: margin, right: margin },
      });

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
      addSectionTitle(doc, '2) Last 14 Days Overview', margin, y);
      y += 14;

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Spend ($)', 'Conversions', 'Clicks']],
        body: chartData.map((d) => [String(d.date), Number(d.spend).toFixed(2), `${Number(d.conversions)}`, `${Number(d.clicks)}`]),
        theme: 'striped',
        styles: { fontSize: 8.5, cellPadding: 5, textColor: [24, 24, 27] },
        headStyles: { fillColor: [39, 39, 42], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      const reportDate = new Date().toISOString().slice(0, 10);
      doc.save(`adwise-dashboard-report-${reportDate}.pdf`);
    } catch (e) {
      console.error(e);
      setError('Failed to generate dashboard PDF report. Please try again.');
    } finally {
      setExportingReport(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 z-10 relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight transition-colors">
            Dashboard Overview
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 transition-colors">
            Welcome back, <span className="text-zinc-900 dark:text-white font-bold">{user?.name}</span>. Monitor campaign health and optimize spend.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleExportDashboardPdf}
            disabled={exportingReport || loading || !metrics}
            className="flex items-center justify-center gap-2 px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-500 bg-white/40 dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl text-xs font-semibold transition-all disabled:opacity-60 shrink-0"
          >
            {exportingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            {exportingReport ? 'Generating PDF...' : 'Export PDF'}
          </button>

          {/* Dynamic CSV Upload Widget */}
          <div className="bg-white/80 dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-600 rounded-xl p-3 flex items-center gap-4 w-full md:max-w-sm shrink-0 backdrop-blur-md transition-colors shadow-sm dark:shadow-none">
          <div className="bg-zinc-100 dark:bg-zinc-800 p-2.5 rounded-lg text-zinc-900 dark:text-zinc-100 transition-colors">
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-colors">Import CSV / Excel metrics</h3>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate leading-snug">
              {jobProgressMsg || 'Upload CSV or Excel file...'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/campaign_metrics_template.csv"
              download="campaign_metrics_template.csv"
              className="flex items-center justify-center gap-1 px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-bold transition-all"
              title="Download CSV template with required columns"
            >
              <Download className="w-3.5 h-3.5" />
              Template
            </a>
            <label className="relative flex items-center justify-center px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-bold cursor-pointer transition-all">
              Choose File
              <input 
                type="file" 
                accept=".csv,.xlsx,.xls" 
                onChange={handleFileUpload} 
                disabled={uploading} 
                className="hidden" 
              />
            </label>
          </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-300">Data Import/System Alert</h4>
            <p className="text-xs text-rose-400/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {jobStatus === 'COMPLETED' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-emerald-300">Data Processing Complete</h4>
            <p className="text-xs text-emerald-400/90 mt-0.5">{jobProgressMsg}</p>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      {loading && !metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white/80 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-6 h-28 animate-pulse shadow-sm dark:shadow-none transition-colors" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Spend */}
          <div className="bg-white/80 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-500 rounded-2xl p-6 transition-all duration-300 group hover:translate-y-[-2px] backdrop-blur-md shadow-sm dark:shadow-none">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Ad Spend</span>
              <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl text-zinc-900 dark:text-zinc-100 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 transition-colors">
                ${metrics?.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </h2>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold">Across all campaigns</p>
            </div>
          </div>

          {/* Card 2: Total Conversions */}
          <div className="bg-white/80 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-500 rounded-2xl p-6 transition-all duration-300 group hover:translate-y-[-2px] backdrop-blur-md shadow-sm dark:shadow-none">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Conversions</span>
              <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl text-zinc-900 dark:text-zinc-100 group-hover:scale-110 transition-transform duration-300">
                <Target className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 transition-colors">
                {metrics?.totalConversions.toLocaleString() || '0'}
              </h2>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold">
                Avg CV%: {metrics?.avgConversionRate.toFixed(2) || '0.00'}%
              </p>
            </div>
          </div>

          {/* Card 3: Cost Per Acquisition */}
          <div className="bg-white/80 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-500 rounded-2xl p-6 transition-all duration-300 group hover:translate-y-[-2px] backdrop-blur-md shadow-sm dark:shadow-none">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Average CPA</span>
              <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl text-zinc-900 dark:text-zinc-100 group-hover:scale-110 transition-transform duration-300">
                <Percent className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 transition-colors">
                ${metrics?.avgCpa.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </h2>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold">
                Avg CPC: ${metrics?.avgCpc.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>

          {/* Card 4: Overall Performance Score */}
          <div className="bg-white/80 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-500 rounded-2xl p-6 transition-all duration-300 group hover:translate-y-[-2px] backdrop-blur-md relative overflow-hidden shadow-sm dark:shadow-none">
            <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-600/5 dark:bg-zinc-600/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Performance Score</span>
              <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl text-zinc-900 dark:text-zinc-100 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1 transition-colors">
                {metrics?.overallScore || '0'}<span className="text-xs text-zinc-500">/100</span>
              </h2>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-zinc-500 animate-pulse" /> Custom Score Algorithm
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts & Ingestion Instructions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart Card */}
        <div className="bg-white/80 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-4 sm:p-6 lg:col-span-2 flex flex-col justify-between backdrop-blur-md h-[320px] sm:h-[400px] shadow-sm dark:shadow-none transition-colors">
          <div className="flex justify-between items-center pb-4 border-b border-zinc-300 dark:border-zinc-600">
            <div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 transition-colors">Daily Metric Overview</h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Trailing 14 days campaign performance</p>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600/50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer transition-colors">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 mt-6 text-[10px] sm:text-xs min-h-0">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                <span className="text-zinc-500 font-medium">Waiting for campaign data...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme === 'light' ? '#18181b' : '#ffffff'} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={theme === 'light' ? '#18181b' : '#ffffff'} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#e2e8f0' : '#1e293b'} vertical={false} />
                  <XAxis dataKey="date" stroke={theme === 'light' ? '#71717a' : '#a1a1aa'} />
                  <YAxis yAxisId="left" stroke={theme === 'light' ? '#18181b' : '#f4f4f5'} />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'light' ? '#ffffff' : '#09090b', 
                      borderColor: theme === 'light' ? '#e4e4e7' : '#27272a', 
                      color: theme === 'light' ? '#18181b' : '#f4f4f5', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="spend" 
                    name="Spend ($)" 
                    stroke={theme === 'light' ? '#18181b' : '#ffffff'} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSpend)" 
                  />
                  <Area 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="conversions" 
                    name="Conversions" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorConversions)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Upload and Ingestion Instructions Card */}
        <div className="bg-white/80 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-600 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md relative overflow-hidden shadow-sm dark:shadow-none transition-colors">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 transition-colors">
              <UploadCloud className="w-5 h-5 text-zinc-800 dark:text-zinc-200" /> System Guide
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed transition-colors">
              Download the CSV template, fill in your campaign metrics, then upload the file to populate analytics.
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-300 dark:border-zinc-600 p-4 rounded-xl space-y-2 transition-colors">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest leading-none">Required columns</p>
              <p className="text-xs font-mono text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 p-2 rounded border border-zinc-300 dark:border-zinc-600 transition-colors">
                Date, Campaign, Platform, Spend, Clicks, Impressions, Conversions
              </p>
            </div>
            <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400 transition-colors">
              <li className="flex items-start gap-2.5">
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">1</span>
                <span>Click <strong>Template</strong> at the top to download the CSV, then replace the sample rows with your data.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">2</span>
                <span>Upload the filled CSV or Excel file using <strong>Choose File</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">3</span>
                <span>The backend processes data on an <strong>asynchronous background worker thread</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">4</span>
                <span>Once processing completes, dashboard metrics will refresh automatically.</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-300 dark:border-zinc-600 flex items-center gap-2 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            AdWise AI Analytics Suite v1.0
          </div>
        </div>
      </div>
    </div>
  );
}
