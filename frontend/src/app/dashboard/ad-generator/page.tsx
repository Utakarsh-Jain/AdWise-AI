'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import { 
  Sparkles, 
  Loader2, 
  Copy, 
  Check, 
  Eye, 
  Megaphone,
  Smartphone,
  Laptop,
  ThumbsUp,
  MessageCircle,
  Share2,
  Heart,
  Bookmark,
  Send,
  MoreHorizontal,
  Globe,
  Search,
  CheckCircle,
  Edit3,
  Sun,
  Moon,
  ChevronRight
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
  
  // Interactive Live Copy States
  const [liveHeadline, setLiveHeadline] = useState('');
  const [livePrimaryText, setLivePrimaryText] = useState('');
  const [liveCta, setLiveCta] = useState('');
  const [liveDescription, setLiveDescription] = useState('');
  
  // Customizer and Simulator Settings
  const [isEditingLive, setIsEditingLive] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<'facebook' | 'instagram' | 'google' | 'linkedin'>('facebook');
  const [simulatorTheme, setSimulatorTheme] = useState<'light' | 'dark'>('light');

  // Copy state feedbacks
  const [copiedHeadline, setCopiedHeadline] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Sync live states when generatedAd is returned
  useEffect(() => {
    if (generatedAd) {
      setLiveHeadline(generatedAd.headline || '');
      setLivePrimaryText(generatedAd.primaryText || '');
      setLiveCta(generatedAd.cta || 'Learn More');
      setLiveDescription(generatedAd.description || '');
      
      // Auto-set preview platform tab
      if (platform === 'meta') {
        setPreviewPlatform('facebook');
      } else if (platform === 'google') {
        setPreviewPlatform('google');
      } else {
        setPreviewPlatform('linkedin');
      }
    }
  }, [generatedAd, platform]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !audience) {
      setError('Please provide a description and target audience.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setGeneratedAd(null);

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

  const copyToClipboard = (text: string, type: 'headline' | 'body' | 'all') => {
    if (type === 'all') {
      const fullText = `Headline: ${liveHeadline}\nPrimary Text: ${livePrimaryText}\nDescription: ${liveDescription}\nCTA: ${liveCta}`;
      navigator.clipboard.writeText(fullText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } else if (type === 'headline') {
      navigator.clipboard.writeText(text);
      setCopiedHeadline(true);
      setTimeout(() => setCopiedHeadline(false), 2000);
    } else {
      navigator.clipboard.writeText(text);
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
  };

  const handlePreFill = () => {
    setDescription('A smart water bottle that tracks your hydration levels, syncs with your phone, and glows when it is time to drink water.');
    setAudience('Health enthusiasts, office workers, tech lovers');
    setKeywords('hydration, smart bottle, glow, fitness');
  };

  // Get current system time formatted for phone simulator
  const getSimulatedTime = () => {
    return '9:41';
  };

  return (
    <div className="space-y-8 z-10 relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5 transition-colors">
            <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" /> AI Ad Copywriter
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 transition-colors text-sm">
            Generate high-converting ad copy dynamically powered by Gemini AI and preview them live in social feed templates.
          </p>
        </div>
        <button
          onClick={handlePreFill}
          className="self-start md:self-center text-xs font-semibold px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-350 rounded-xl transition-all border border-slate-200 dark:border-zinc-800"
        >
          ✨ Try Demo Product
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side - Controls Form */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-6 shadow-md dark:shadow-none space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-zinc-900">
            <Megaphone className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Creative Setup</h3>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Platform Tab Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Target Platform</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-zinc-950 p-1.5 rounded-2xl border border-slate-200/50 dark:border-zinc-900">
                {(['meta', 'google', 'linkedin'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl transition-all capitalize ${
                      platform === p
                        ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-650 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-205'
                    }`}
                  >
                    {p === 'meta' ? 'Meta' : p}
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
                className="w-full text-sm rounded-2xl border border-slate-200 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/50 transition-all resize-none"
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
                className="w-full text-sm rounded-2xl border border-slate-200 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
                className="w-full text-sm rounded-2xl border border-slate-200 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-650 hover:bg-indigo-600 active:bg-indigo-700 disabled:opacity-70 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/30"
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
          
          {/* Top Bar Navigation for Preview Simulator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/60 dark:border-zinc-800 pb-3 gap-3">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Interactive Mockup Preview</h3>
            </div>
            
            {/* Platform Tab Selectors */}
            {generatedAd && (
              <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200/50 dark:border-zinc-800">
                {(['facebook', 'instagram', 'google', 'linkedin'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setPreviewPlatform(tab)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all capitalize ${
                      previewPlatform === tab
                        ? 'bg-white dark:bg-zinc-850 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-550 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab === 'facebook' ? 'Facebook' : tab === 'instagram' ? 'Instagram' : tab === 'google' ? 'Google' : 'LinkedIn'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!generatedAd && !loading ? (
            <div className="bg-slate-50 dark:bg-zinc-950/20 border-2 border-dashed border-slate-200 dark:border-zinc-800/80 rounded-3xl p-12 text-center space-y-3 flex flex-col items-center justify-center min-h-[460px]">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-400">
                <Megaphone className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-700 dark:text-slate-350">No Ad Copy Generated Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Fill out the configuration form on the left and click "Generate Ad Copy" to launch our copywriting engine.
              </p>
            </div>
          ) : loading ? (
            <div className="bg-slate-50 dark:bg-zinc-950/20 border-2 border-dashed border-slate-200 dark:border-zinc-800/80 rounded-3xl p-12 text-center space-y-4 flex flex-col items-center justify-center min-h-[460px] animate-pulse">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-700 dark:text-slate-300">Writing copies with Gemini...</h4>
                <p className="text-xs text-slate-500">Creating high-converting headlines and descriptors.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* iPhone Simulator Grid Column */}
              <div className="md:col-span-7 flex flex-col items-center">
                
                {/* Simulator Toolbar Controls */}
                <div className="w-full max-w-[340px] flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] text-slate-450 dark:text-slate-400 font-bold uppercase tracking-wider">Ad Simulator</span>
                  </div>
                  
                  {/* Light/Dark mode for phone screen */}
                  <div className="flex items-center bg-slate-100 dark:bg-zinc-900 rounded-lg p-0.5 border border-slate-200/50 dark:border-zinc-800">
                    <button
                      onClick={() => setSimulatorTheme('light')}
                      className={`p-1 rounded-md transition-colors ${simulatorTheme === 'light' ? 'bg-white dark:bg-zinc-800 text-indigo-500 shadow-sm' : 'text-slate-450'}`}
                      title="Light Mode Preview"
                    >
                      <Sun className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setSimulatorTheme('dark')}
                      className={`p-1 rounded-md transition-colors ${simulatorTheme === 'dark' ? 'bg-white dark:bg-zinc-800 text-indigo-400 shadow-sm' : 'text-slate-450'}`}
                      title="Dark Mode Preview"
                    >
                      <Moon className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* iPhone Body */}
                <div className="relative w-full max-w-[340px] aspect-[9/18.5] bg-zinc-900 dark:bg-black rounded-[48px] shadow-2xl border-[11px] border-zinc-950 p-2 overflow-hidden flex flex-col transition-all duration-300 ring-4 ring-slate-100 dark:ring-zinc-900/30">
                  
                  {/* Dynamic Apple Dynamic Island / Speaker notch */}
                  <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-black rounded-full z-30 flex items-center justify-end px-3">
                    <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full mr-2" />
                    <div className="w-1 h-1 bg-blue-900/40 rounded-full" />
                  </div>

                  {/* Simulator Screen */}
                  <div className={`h-full w-full rounded-[38px] overflow-hidden flex flex-col relative select-none border border-zinc-850/20 ${
                    simulatorTheme === 'light' 
                      ? 'bg-slate-50 text-zinc-900' 
                      : 'bg-zinc-950 text-zinc-100'
                  }`}>
                    
                    {/* Status Bar */}
                    <div className="h-10 pt-3 px-6 flex justify-between items-center z-25 text-[10px] font-bold tracking-tight">
                      <span>{getSimulatedTime()}</span>
                      <div className="flex items-center gap-1">
                        {/* Signal Bars */}
                        <div className="flex items-end gap-[1.5px] h-2.5">
                          <div className="w-[2px] h-1 bg-current" />
                          <div className="w-[2px] h-1.5 bg-current" />
                          <div className="w-[2px] h-2 bg-current" />
                          <div className="w-[2px] h-2.5 bg-current" />
                        </div>
                        {/* Wifi icon */}
                        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                          <path d="M12 21l-12-12c5.074-5.074 18.926-5.074 24 0l-12 12zm0-16.828c-3.896 0-7.391 1.761-9.771 4.545l9.771 9.771 9.771-9.771c-2.38-2.784-5.875-4.545-9.771-4.545z"/>
                        </svg>
                        {/* Battery */}
                        <div className="w-5 h-2.5 rounded-[3px] border border-current p-[1px] flex items-center">
                          <div className="h-full w-3.5 bg-current rounded-[1px]" />
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Feed Screen Area */}
                    <div className="flex-1 overflow-y-auto px-3.5 pb-8 scrollbar-none pt-2">
                      
                      {/* --- FACEBOOK PREVIEW TEMPLATE --- */}
                      {previewPlatform === 'facebook' && (
                        <div className={`rounded-2xl border transition-all ${
                          simulatorTheme === 'light' 
                            ? 'bg-white border-zinc-200/80 shadow-sm' 
                            : 'bg-zinc-900 border-zinc-800'
                        } overflow-hidden`}>
                          
                          {/* Post Header */}
                          <div className="p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-xs">
                                AW
                              </div>
                              <div>
                                <h5 className="text-[11px] font-bold tracking-tight">AdWise AI</h5>
                                <div className="flex items-center gap-1 text-[9px] text-zinc-400 mt-0.5">
                                  <span>Sponsored</span>
                                  <span>•</span>
                                  <Globe className="w-2.5 h-2.5" />
                                </div>
                              </div>
                            </div>
                            <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                          </div>

                          {/* Primary Body Copy */}
                          <p className="px-3.5 pb-3 text-[10.5px] leading-relaxed whitespace-pre-wrap">
                            {livePrimaryText || 'Your main marketing copy goes here...'}
                          </p>

                          {/* Ad Visual Graphic Attachment */}
                          <div className="aspect-[1.91/1] bg-gradient-to-br from-indigo-650/10 via-purple-650/15 to-pink-650/10 border-y border-zinc-200/50 dark:border-zinc-850 flex flex-col items-center justify-center p-4 text-center space-y-1 relative">
                            <Megaphone className="w-8 h-8 text-indigo-500/55 animate-bounce" style={{ animationDuration: '4s' }} />
                            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">Visual Ad Asset</span>
                          </div>

                          {/* Meta Footer Banner (CTA Panel) */}
                          <div className={`p-3 flex justify-between items-center gap-3 border-t ${
                            simulatorTheme === 'light' ? 'bg-zinc-50 border-zinc-100' : 'bg-zinc-950/40 border-zinc-850'
                          }`}>
                            <div className="min-w-0 flex-1">
                              <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">ADWISE.AI</span>
                              <h6 className="text-[10px] font-bold truncate mt-0.5">
                                {liveHeadline || 'Engaging Ad Headline'}
                              </h6>
                              <p className="text-[9px] text-zinc-455 dark:text-zinc-400 truncate mt-0.5">
                                {liveDescription || 'Core benefits list description'}
                              </p>
                            </div>
                            <button className="py-1.5 px-3 bg-zinc-200/80 hover:bg-zinc-250 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-xs font-bold rounded-lg shrink-0 text-[10px]">
                              {liveCta || 'Learn More'}
                            </button>
                          </div>

                          {/* Social Actions */}
                          <div className="px-3.5 py-2.5 border-t border-zinc-150 dark:border-zinc-850/80 flex items-center justify-between text-zinc-400 text-[10px]">
                            <div className="flex items-center gap-1 font-medium">
                              <ThumbsUp className="w-3.5 h-3.5 text-blue-500" />
                              <span>124 Likes</span>
                            </div>
                            <div className="flex gap-2">
                              <span>18 Comments</span>
                              <span>•</span>
                              <span>9 Shares</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* --- INSTAGRAM PREVIEW TEMPLATE --- */}
                      {previewPlatform === 'instagram' && (
                        <div className={`rounded-2xl border transition-all ${
                          simulatorTheme === 'light' 
                            ? 'bg-white border-zinc-200/80 shadow-sm' 
                            : 'bg-zinc-900 border-zinc-800'
                        } overflow-hidden`}>
                          
                          {/* Top Profile Header */}
                          <div className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600">
                                <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center font-bold text-xs p-1 text-slate-800 dark:text-slate-100">
                                  AW
                                </div>
                              </div>
                              <div>
                                <h5 className="text-[10.5px] font-bold tracking-tight">adwise.ai</h5>
                                <span className="text-[8.5px] text-zinc-400 tracking-wide block mt-0.2">Sponsored</span>
                              </div>
                            </div>
                            <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                          </div>

                          {/* Visual Media Box */}
                          <div className="aspect-square bg-gradient-to-br from-indigo-550/10 via-purple-550/15 to-pink-550/10 border-y border-zinc-200/50 dark:border-zinc-850 flex flex-col items-center justify-center p-6 text-center space-y-1.5 relative">
                            <div className="absolute top-3 right-3 bg-zinc-950/60 text-[8px] font-bold text-white px-2 py-0.5 rounded-full">
                              1/1
                            </div>
                            <Heart className="w-8 h-8 text-pink-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-widest bg-pink-500/10 px-2 py-0.5 rounded">Ad Image Media</span>
                          </div>

                          {/* Instagram CTA blue bar */}
                          <div className="py-2.5 px-3.5 bg-blue-600 text-white flex justify-between items-center text-[10px] font-bold cursor-pointer hover:bg-blue-500 transition-colors">
                            <span>{liveCta || 'Learn More'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>

                          {/* Icons Tray */}
                          <div className="p-3 flex items-center justify-between text-zinc-550 dark:text-zinc-300">
                            <div className="flex items-center gap-3">
                              <Heart className="w-4 h-4" />
                              <MessageCircle className="w-4 h-4" />
                              <Send className="w-4 h-4" />
                            </div>
                            <Bookmark className="w-4 h-4" />
                          </div>

                          {/* Likes Count */}
                          <div className="px-3 pb-1.5 text-[10px] font-bold">
                            325 likes
                          </div>

                          {/* Username + Caption */}
                          <div className="px-3 pb-4 text-[10px] leading-relaxed">
                            <span className="font-bold mr-1.5">adwise.ai</span>
                            <span className="text-zinc-650 dark:text-zinc-350 whitespace-pre-wrap">{livePrimaryText}</span>
                          </div>
                        </div>
                      )}

                      {/* --- GOOGLE SEARCH PREVIEW TEMPLATE --- */}
                      {previewPlatform === 'google' && (
                        <div className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                          simulatorTheme === 'light' 
                            ? 'bg-white border-zinc-200/80 shadow-sm' 
                            : 'bg-zinc-900 border-zinc-800'
                        }`}>
                          
                          {/* Search Header Branding */}
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-zinc-850 flex items-center justify-center text-[9px] font-bold text-zinc-500">
                              G
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] text-zinc-500 block font-semibold truncate leading-none">https://www.adwise.ai</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[7.5px] font-extrabold text-zinc-900 dark:text-white bg-slate-100 dark:bg-zinc-800 px-1 py-0.1 rounded border border-zinc-200/60 dark:border-zinc-750">Sponsored</span>
                              </div>
                            </div>
                          </div>

                          {/* Google Search Link Title */}
                          <h4 className="text-sm font-semibold text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-snug">
                            {liveHeadline || 'Engaging Google Search Ad Headline'}
                          </h4>

                          {/* Google Snippet Text */}
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200 uppercase text-[8.5px] border-r border-zinc-200 dark:border-zinc-800 pr-1.5 mr-1.5">{liveCta || 'Learn More'}</span>
                            {livePrimaryText || 'Create high-converting campaigns.'}
                          </p>
                        </div>
                      )}

                      {/* --- LINKEDIN PREVIEW TEMPLATE --- */}
                      {previewPlatform === 'linkedin' && (
                        <div className={`rounded-2xl border transition-all ${
                          simulatorTheme === 'light' 
                            ? 'bg-white border-zinc-200/80 shadow-sm' 
                            : 'bg-zinc-900 border-zinc-800'
                        } overflow-hidden`}>
                          
                          {/* Post Header */}
                          <div className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8.5 h-8.5 rounded bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px]">
                                AW
                              </div>
                              <div>
                                <h5 className="text-[10.5px] font-bold tracking-tight">AdWise AI Solutions</h5>
                                <span className="text-[8.5px] text-zinc-400 block mt-0.2">124,000 followers</span>
                                <span className="text-[8.5px] text-zinc-400 block">Promoted • 🌐</span>
                              </div>
                            </div>
                            <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                          </div>

                          {/* Post Body text */}
                          <p className="px-3 pb-3 text-[10px] leading-relaxed whitespace-pre-wrap">
                            {livePrimaryText || 'Your LinkedIn copy goes here...'}
                          </p>

                          {/* LinkedIn Card Attachment */}
                          <div className="border border-zinc-200/60 dark:border-zinc-800 mx-3.5 mb-3 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-zinc-950/30">
                            <div className="aspect-[1.91/1] bg-gradient-to-br from-indigo-500/10 to-blue-500/15 flex items-center justify-center p-4 text-center">
                              <Laptop className="w-7 h-7 text-indigo-500/65" />
                            </div>
                            
                            <div className="p-3 border-t border-zinc-150 dark:border-zinc-850/80 flex justify-between items-center gap-3">
                              <div className="min-w-0 flex-1">
                                <h6 className="text-[10.5px] font-bold truncate">
                                  {liveHeadline || 'High Conversion Headline'}
                                </h6>
                                <p className="text-[8.5px] text-zinc-400 truncate mt-0.5">
                                  {liveDescription || 'adwise.ai'}
                                </p>
                              </div>
                              <button className="py-1 px-3 border border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-400 text-[9px] font-bold rounded-full shrink-0 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                                {liveCta || 'Learn More'}
                              </button>
                            </div>
                          </div>

                          {/* Bottom Stats Tray */}
                          <div className="px-3.5 py-2.5 border-t border-zinc-150 dark:border-zinc-850/80 flex items-center justify-between text-zinc-400 text-[9px]">
                            <span>👍 42 Likes</span>
                            <span>• 12 Comments</span>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Bottom Home Indicator Bar */}
                    <div className="h-6 flex items-center justify-center z-30">
                      <div className="w-32 h-1 bg-zinc-400/80 rounded-full" />
                    </div>

                  </div>
                </div>

              </div>

              {/* Editing controls & copy utilities Grid Column */}
              <div className="md:col-span-5 space-y-5">
                
                {/* Live Customizer Card Wrapper */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Copy Adjuster</h4>
                    </div>
                    
                    {/* Live Customizer Switch Button */}
                    <button
                      onClick={() => setIsEditingLive(!isEditingLive)}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                        isEditingLive 
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-650 border-indigo-200' 
                          : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-750 text-slate-600 dark:text-slate-450 hover:bg-slate-100'
                      }`}
                    >
                      {isEditingLive ? 'Lock & Save' : 'Edit Copy Live'}
                    </button>
                  </div>

                  {isEditingLive ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Headline</label>
                        <input
                          type="text"
                          value={liveHeadline}
                          onChange={(e) => setLiveHeadline(e.target.value)}
                          className="w-full text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Primary Text</label>
                        <textarea
                          rows={4}
                          value={livePrimaryText}
                          onChange={(e) => setLivePrimaryText(e.target.value)}
                          className="w-full text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">CTA Action</label>
                          <select
                            value={liveCta}
                            onChange={(e) => setLiveCta(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="Learn More">Learn More</option>
                            <option value="Sign Up">Sign Up</option>
                            <option value="Shop Now">Shop Now</option>
                            <option value="Download">Download</option>
                            <option value="Book Now">Book Now</option>
                            <option value="Contact Us">Contact Us</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Description</label>
                          <input
                            type="text"
                            value={liveDescription}
                            onChange={(e) => setLiveDescription(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Headline</span>
                        <p className="text-xs text-slate-800 dark:text-slate-250 font-bold leading-tight">{liveHeadline}</p>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Primary Text</span>
                        <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">{livePrimaryText}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">CTA</span>
                          <p className="text-xs text-slate-800 dark:text-slate-250 font-semibold">{liveCta}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Sub-Description</span>
                          <p className="text-xs text-slate-800 dark:text-slate-250 font-semibold">{liveDescription}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Copy Utilities Card */}
                <div className="bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-5 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-850 dark:text-zinc-300">Copy Actions</h4>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => copyToClipboard(liveHeadline, 'headline')}
                      className="flex items-center justify-between py-2.5 px-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                    >
                      <span className="flex items-center gap-2">
                        {copiedHeadline ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy Headline
                      </span>
                      {copiedHeadline && <span className="text-[9px] font-bold text-emerald-500">Copied!</span>}
                    </button>
                    
                    <button
                      onClick={() => copyToClipboard(livePrimaryText, 'body')}
                      className="flex items-center justify-between py-2.5 px-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                    >
                      <span className="flex items-center gap-2">
                        {copiedBody ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy Primary Text
                      </span>
                      {copiedBody && <span className="text-[9px] font-bold text-emerald-500">Copied!</span>}
                    </button>

                    <button
                      onClick={() => copyToClipboard('', 'all')}
                      className="flex items-center justify-between py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-600/10"
                    >
                      <span className="flex items-center gap-2">
                        {copiedAll ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy Full Ad Details
                      </span>
                      {copiedAll && <span className="text-[9px] font-bold text-white">Copied!</span>}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
