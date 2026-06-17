'use client';

import React, { useState } from 'react';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import { 
  Sparkles, 
  Loader2, 
  Copy, 
  Check, 
  Eye, 
  Megaphone,
  Smartphone,
  Laptop
} from 'lucide-react';

interface GeneratedAd {
  headline: string;
  primaryText: string;
  cta: string;
  description: string;
}

export default function AdGenerator() {
  const { token } = useAuth();
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState('');
  const [keywords, setKeywords] = useState('');
  const [platform, setPlatform] = useState<'meta' | 'google' | 'linkedin'>('meta');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAd, setGeneratedAd] = useState<GeneratedAd | null>(null);
  
  // Copy state feedbacks
  const [copiedHeadline, setCopiedHeadline] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !audience) {
      setError('Please provide a description and target audience.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/ad/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform,
          description,
          audience,
          keywords,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate ad copy.');

      setGeneratedAd(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generating ad copy.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'headline' | 'body') => {
    navigator.clipboard.writeText(text);
    if (type === 'headline') {
      setCopiedHeadline(true);
      setTimeout(() => setCopiedHeadline(false), 2000);
    } else {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
  };

  const handlePreFill = () => {
    setDescription('A smart water bottle that tracks your hydration levels, syncs with your phone, and glows when it is time to drink water.');
    setAudience('Health enthusiasts, office workers, tech lovers');
    setKeywords('hydration, smart bottle, glow, fitness');
  };

  return (
    <div className="space-y-8 z-10 relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2.5 transition-colors">
            <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" /> AI Ad Copywriter
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 transition-colors">
            Generate high-converting ad copy dynamically powered by Gemini AI and preview them live in social feed templates.
          </p>
        </div>
        <button
          onClick={handlePreFill}
          className="self-start md:self-center text-xs font-semibold px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all border border-slate-200 dark:border-slate-800"
        >
          ✨ Try Demo Product
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side - Controls Form */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-md dark:shadow-none space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-900">
            <Megaphone className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Creative Setup</h3>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Platform Tab Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Target Platform</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-900">
                {(['meta', 'google', 'linkedin'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl transition-all capitalize ${
                      platform === p
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {p === 'meta' ? 'Meta / Facebook' : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Product description */}
            <div className="space-y-1.5">
              <label htmlFor="description" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Product/Service Description
              </label>
              <textarea
                id="description"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you are advertising, key features, and core offer..."
                className="w-full text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/50 transition-all resize-none"
              />
            </div>

            {/* Target Audience */}
            <div className="space-y-1.5">
              <label htmlFor="audience" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Target Audience
              </label>
              <input
                id="audience"
                type="text"
                required
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="E.g., Young professionals, busy parents, remote workers"
                className="w-full text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Keywords */}
            <div className="space-y-1.5">
              <label htmlFor="keywords" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Keywords & Brand Tone (Optional)
              </label>
              <input
                id="keywords"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="E.g., premium, energetic, limited discount, friendly"
                className="w-full text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {error && (
              <div className="text-rose-500 text-xs font-semibold bg-rose-500/10 border border-rose-500/10 rounded-xl p-3">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-70 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Copywriting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Ad Copy
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side - Previews Screen */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Interactive Ad Mockup Preview</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/80">
              <Smartphone className="w-3.5 h-3.5" /> Mobile Feed
            </div>
          </div>

          {!generatedAd && !loading ? (
            <div className="bg-slate-50 dark:bg-slate-950/20 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-3xl p-12 text-center space-y-3 flex flex-col items-center justify-center min-h-[400px]">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400">
                <Megaphone className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-700 dark:text-slate-300">No Ad Copy Generated Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Fill out the configuration form on the left and click "Generate Ad Copy" to launch our copywriting engine.
              </p>
            </div>
          ) : loading ? (
            <div className="bg-slate-50 dark:bg-slate-950/20 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-3xl p-12 text-center space-y-4 flex flex-col items-center justify-center min-h-[400px] animate-pulse">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-700 dark:text-slate-300">Writing copies with Gemini...</h4>
                <p className="text-xs text-slate-500">Creating high-converting headlines and descriptors.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Copying Controls Header */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => copyToClipboard(generatedAd!.headline, 'headline')}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all"
                >
                  {copiedHeadline ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedHeadline ? 'Headline Copied!' : 'Copy Headline Only'}
                </button>
                <button
                  onClick={() => copyToClipboard(generatedAd!.primaryText, 'body')}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all"
                >
                  {copiedBody ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedBody ? 'Body Copy Copied!' : 'Copy Full Body Text'}
                </button>
              </div>

              {/* Mockup Render Switch */}
              {platform === 'meta' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg max-w-md mx-auto">
                  {/* Meta Post Header */}
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-black text-white text-sm shadow-md">
                      AW
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">AdWise AI Promoted</h4>
                      <span className="text-[10px] text-slate-500 font-semibold tracking-wide block mt-0.5">Sponsored • 🌐</span>
                    </div>
                  </div>

                  {/* Meta Primary text */}
                  <div className="px-4 pb-3 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {generatedAd?.primaryText}
                  </div>

                  {/* Meta Image Mockup */}
                  <div className="aspect-[1.91/1] bg-gradient-to-br from-indigo-600/10 via-purple-600/20 to-pink-600/10 border-y border-slate-100 dark:border-slate-800/80 flex flex-col items-center justify-center p-6 text-center space-y-2 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                    <Megaphone className="w-10 h-10 text-indigo-500/60 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">Ad Image Mockup</span>
                  </div>

                  {/* Meta Footer CTA Panel */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ADWISE.AI</span>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate mt-0.5">
                        {generatedAd?.headline}
                      </h5>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {generatedAd?.description}
                      </p>
                    </div>
                    <button className="py-2 px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg shrink-0 transition-colors">
                      {generatedAd?.cta || 'Learn More'}
                    </button>
                  </div>
                </div>
              )}

              {platform === 'google' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-lg max-w-xl mx-auto space-y-3.5">
                  {/* Google Header Branding */}
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      G
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-slate-800 dark:text-slate-350 block font-semibold truncate leading-none">https://www.adwise.ai</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-extrabold text-slate-900 dark:text-white bg-slate-200/80 dark:bg-slate-800 px-1 py-0.2 rounded">Sponsored</span>
                      </div>
                    </div>
                  </div>

                  {/* Google Blue Link Title */}
                  <h4 className="text-lg font-medium text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-tight">
                    {generatedAd?.headline}
                  </h4>

                  {/* Google Description Text */}
                  <p className="text-xs text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed whitespace-pre-wrap">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{generatedAd?.cta} • </span>
                    {generatedAd?.primaryText}
                  </p>
                </div>
              )}

              {platform === 'linkedin' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg max-w-md mx-auto">
                  {/* LinkedIn Header */}
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-slate-200 dark:bg-slate-850 flex items-center justify-center font-black text-indigo-500 text-sm">
                      AW
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">AdWise AI Solutions</h4>
                      <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">120,400 followers</span>
                      <span className="text-[9px] text-slate-500 font-semibold block">Promoted • 🌐</span>
                    </div>
                  </div>

                  {/* LinkedIn Body text */}
                  <div className="px-4 pb-3 text-xs text-slate-850 dark:text-slate-250 whitespace-pre-wrap leading-relaxed">
                    {generatedAd?.primaryText}
                  </div>

                  {/* LinkedIn Card Box */}
                  <div className="border border-slate-200 dark:border-slate-800 mx-4 mb-4 rounded-xl overflow-hidden">
                    <div className="aspect-[1.91/1] bg-gradient-to-br from-blue-600/10 to-indigo-600/10 flex items-center justify-center p-6 text-center">
                      <Laptop className="w-10 h-10 text-indigo-500/60" />
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">
                          {generatedAd?.headline}
                        </h5>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {generatedAd?.description}
                        </p>
                      </div>
                      <button className="py-1.5 px-3 border border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 text-xs font-bold rounded-full shrink-0 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                        {generatedAd?.cta || 'Learn More'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
