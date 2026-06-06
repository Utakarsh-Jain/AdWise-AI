'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Loader2, Sparkles } from 'lucide-react';

export default function RootPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center gap-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="z-10 flex flex-col items-center gap-4">
        <div className="bg-indigo-600/10 p-4 rounded-2xl border border-indigo-500/20 text-indigo-400">
          <Sparkles className="w-10 h-10 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="text-center">
          <h1 className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
            AdWise AI
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-widest">
            Campaign Optimization
          </p>
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-4" />
      </div>
    </div>
  );
}
