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
          (window as any).google.accounts.id.renderButton(buttonDiv, {
            theme: 'outline',
            size: 'large',
            width: buttonDiv.clientWidth || 340,
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Brand Panel — desktop only */}
      <div className="hidden lg:flex lg:w-[460px] xl:w-[500px] relative bg-zinc-950 dark:bg-black flex-col justify-between p-10 overflow-hidden flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800">
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/[0.02]" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/[0.01]" />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">AdWise AI</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
              Start growing<br />
              <span className="text-zinc-400">your ads today.</span>
            </h1>
            <p className="mt-4 text-zinc-400 text-sm leading-relaxed max-w-xs">
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
                <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-zinc-400" />
                </div>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-zinc-600">© 2026 AdWise AI. All rights reserved.</p>
        </div>
      </div>

      {/* Mobile Brand Header — phones/tablets only */}
      <div className="lg:hidden bg-zinc-950 dark:bg-black px-6 py-8 sm:px-8 sm:py-10 text-center border-b border-zinc-800">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">AdWise AI</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">Get Started</h2>
        <p className="text-zinc-400 text-sm mt-1">Create your AdWise AI account</p>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center px-5 py-8 sm:px-8 sm:py-12 lg:px-16 xl:px-20 bg-white dark:bg-zinc-950">
        <div className="w-full max-w-[380px]">
          {/* Desktop heading */}
          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
              Create your account
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Already have an account?{' '}
              <Link href="/login" className="text-zinc-900 dark:text-white hover:underline font-medium decoration-zinc-400 underline-offset-4">
                Sign in
              </Link>
            </p>
          </div>

          {/* Mobile subtext */}
          <p className="lg:hidden text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">
            Already have an account?{' '}
            <Link href="/login" className="text-zinc-900 dark:text-white hover:underline font-medium decoration-zinc-400 underline-offset-4">
              Sign in
            </Link>
          </p>

          <div className="lg:mt-8 space-y-6">
            {/* Google */}
            {GOOGLE_CLIENT_ID && (
              <>
                <div className="flex justify-center w-full min-h-[44px]">
                  <div id="google-signup-btn" className="w-full"></div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white dark:bg-zinc-950 px-3 text-zinc-400 dark:text-zinc-500">or</span>
                  </div>
                </div>
              </>
            )}

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3.5 py-3 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Full name
                </label>
                <input
                  id="name" name="name" type="text" required
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="block w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/40 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Email
                </label>
                <input
                  id="email" name="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="block w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/40 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Password
                </label>
                <input
                  id="password" name="password" type="password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="block w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/40 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-zinc-900 hover:bg-black active:bg-zinc-950 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-950 dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
                ) : (
                  'Create Account'
                )}
              </button>

              <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center leading-relaxed">
                By signing up, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
