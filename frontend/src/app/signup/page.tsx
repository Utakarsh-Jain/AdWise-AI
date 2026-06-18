'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, API_BASE_URL } from '../../context/AuthContext';
import { Loader2, AlertCircle, BarChart3, Zap, TrendingUp } from 'lucide-react';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signup, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  const handleGoogleResponse = useCallback(async (response: any) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google authentication failed.');
      signup(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed.');
    }
  }, [signup]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          use_fedcm: false,
        });
        const buttonDiv = document.getElementById('google-signup-btn');
        if (buttonDiv) {
          const calculatedWidth = Math.min(buttonDiv.clientWidth || 340, typeof window !== 'undefined' ? window.innerWidth - 48 : 340);
          (window as any).google.accounts.id.renderButton(buttonDiv, {
            theme: 'outline',
            size: 'large',
            width: calculatedWidth,
            text: 'signup_with',
            shape: 'pill',
          });
        }
      }
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [handleGoogleResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register.');
      signup(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 md:p-8 relative overflow-hidden transition-colors">
      {/* Background Decorative Grid and Radial Glow */}
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(228,228,231,0.6),transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(39,39,42,0.6),transparent_70%)] pointer-events-none" />

      {/* Main Card Container */}
      <div className="w-full max-w-4xl min-h-[580px] bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-3xl overflow-hidden shadow-xl dark:shadow-none flex flex-col md:flex-row relative z-10">
        
        {/* Left Side: Brand Panel (Hidden on mobile for layout optimization) */}
        <div className="hidden md:flex md:w-[42%] bg-zinc-950 text-white p-10 flex-col justify-between relative overflow-hidden border-r border-zinc-900 shrink-0">
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }} />
          <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-white/[0.02] blur-xl" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-white/[0.01] blur-2xl" />

          {/* Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">AdWise AI</span>
            </div>
          </div>

          {/* Branding Content */}
          <div className="relative z-10 space-y-8 my-auto py-8">
            <div>
              <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
                Start growing<br />
                <span className="text-zinc-500">your ads today.</span>
              </h1>
              <p className="mt-4 text-zinc-400 text-xs leading-relaxed">
                Join thousands of marketers using AI to transform their advertising performance.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: Zap, text: 'Get started in under 2 minutes' },
                { icon: TrendingUp, text: 'See insights from day one' },
                { icon: BarChart3, text: 'No credit card required' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-zinc-300">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-zinc-400" />
                  </div>
                  <span className="text-xs font-semibold">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <div className="relative z-10">
            <p className="text-[10px] text-zinc-600">(c) 2026 AdWise AI. All rights reserved.</p>
          </div>
        </div>

        {/* Mobile Header (Shown on mobile only) */}
        <div className="md:hidden bg-zinc-950 dark:bg-black px-6 py-8 text-center border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-base">AdWise AI</span>
          </div>
          <h2 className="text-lg font-bold text-white">Get Started</h2>
          <p className="text-zinc-400 text-xs mt-1">Create your AdWise AI account</p>
        </div>

        {/* Right Side: Form Panel */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 md:p-12 bg-white dark:bg-zinc-900/50">
          <div className="w-full max-w-[340px] mx-auto">
            {/* Desktop heading */}
            <div className="hidden md:block">
              <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                Create your account
              </h2>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                Already have an account?{' '}
                <Link href="/login" className="text-zinc-900 dark:text-white hover:underline font-semibold decoration-zinc-400 underline-offset-4">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Mobile subtext */}
            <p className="md:hidden text-xs text-zinc-500 dark:text-zinc-400 text-center mb-4">
              Already have an account?{' '}
              <Link href="/login" className="text-zinc-900 dark:text-white hover:underline font-semibold decoration-zinc-400 underline-offset-4">
                Sign in
              </Link>
            </p>

            <div className="md:mt-8 space-y-5">
              {/* Google */}
              {GOOGLE_CLIENT_ID && (
                <>
                  <div className="flex justify-center w-full min-h-[40px]">
                    <div id="google-signup-btn" className="w-full"></div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-zinc-300 dark:border-zinc-600" />
                    </div>
                    <div className="relative flex justify-center text-[10px]">
                      <span className="bg-white dark:bg-zinc-900 px-3 text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">or</span>
                    </div>
                  </div>
                </>
              )}

              {/* Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2.5 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                    Full name
                  </label>
                  <input
                    id="name" name="name" type="text" required
                    value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="block w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-950/20 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-zinc-600 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    id="email" name="email" type="email" autoComplete="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="block w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-950/20 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-zinc-600 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <input
                    id="password" name="password" type="password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="block w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-950/20 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-zinc-600 transition-all"
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-zinc-950 hover:bg-black active:bg-zinc-900 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-950 dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating account...</>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
