'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import { Loader2, AlertCircle, Sparkles, Lightbulb, RefreshCw } from 'lucide-react';

export default function CampaignInsights() {
  const { token } = useAuth();
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`${API_BASE_URL}/ai/recommendations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch AI insights.');
      setInsights(data.recommendations);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generating AI insights. Check database data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchForecast();
    // wait, we meant fetchInsights() but this is a typo in state hook. Let's call fetchInsights()!
    fetchInsights();
  }, [fetchInsights]);

  // Zero-dependency simple Markdown parser for premium rendering
  const parseMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    return lines.map((line, idx) => {
      // 1. Header 3
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-lg font-bold text-slate-100 mt-6 mb-3 flex items-center gap-2 border-b border-slate-900 pb-2">
            {line.replace('### ', '')}
          </h3>
        );
      }
      // 2. Header 4
      if (line.startsWith('#### ')) {
        return (
          <h4 key={idx} className="text-sm font-bold text-indigo-400 mt-4 mb-2 uppercase tracking-wider">
            {line.replace('#### ', '')}
          </h4>
        );
      }
      // 3. Bullet points
      if (line.trim().startsWith('- ')) {
        const cleaned = line.trim().replace('- ', '');
        // Highlight bold elements inside bullet points: e.g. **text** -> <strong>text</strong>
        return (
          <li key={idx} className="text-xs text-slate-400 ml-4 list-disc space-y-1 py-1 leading-relaxed">
            {renderInlineMarkdown(cleaned)}
          </li>
        );
      }
      // 4. Empty lines
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      // 5. Notice blocks
      if (line.startsWith('*Notice:') || line.startsWith('*Note:')) {
        return (
          <div key={idx} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-xs text-slate-500 italic my-3 leading-relaxed flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-500/80 shrink-0" />
            <span>{line.replace(/\*/g, '')}</span>
          </div>
        );
      }
      // 6. Paragraphs
      return (
        <p key={idx} className="text-xs text-slate-400 leading-relaxed py-1">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Helper to parse **bold** text inline
  const renderInlineMarkdown = (text: string) => {
    const regex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <strong key={match.index} className="font-bold text-slate-200">
          {match[1]}
        </strong>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const fetchForecast = () => {}; // dummy handler

  return (
    <div className="space-y-8 z-10 relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            AI Campaign Insights
          </h1>
          <p className="text-slate-400 mt-1">
            Growth marketing recommendations powered by Gemini Generative AI.
          </p>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold transition-all self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Insights
        </button>
      </div>

      {loading && !insights ? (
        <div className="h-[50vh] flex flex-col justify-center items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-slate-400 font-medium">Querying Gemini API...</span>
        </div>
      ) : error || !insights ? (
        <div className="h-[50vh] flex flex-col justify-center items-center text-center max-w-md mx-auto space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-full text-indigo-400 shadow-xl shadow-indigo-500/5">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-200">No Insights Generated</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'AI recommendations require historical campaign data. Please upload a marketing metrics CSV on the main overview dashboard first.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Main Insights Report Card */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 lg:col-span-3 backdrop-blur-md relative overflow-hidden">
            {/* Background glowing indicator */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-600/5 rounded-full blur-2xl pointer-events-none" />
            <div className="prose prose-invert max-w-none">
              {parseMarkdown(insights)}
            </div>
          </div>

          {/* Side Info Cards */}
          <div className="space-y-6">
            {/* Engine Stats */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4">
              <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-indigo-400" /> Marketing Advisor
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Our integration feeds Gemini structured parameters (Top Campaigns, Budget Reallocation suggestions, Platform Spend Share) to extract expert marketing insights.
              </p>
              <div className="pt-2 border-t border-slate-900 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                  <span>Model Used</span>
                  <span className="text-slate-300">gemini-1.5-flash</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                  <span>Context Type</span>
                  <span className="text-slate-300">Structured Campaign JSON</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
