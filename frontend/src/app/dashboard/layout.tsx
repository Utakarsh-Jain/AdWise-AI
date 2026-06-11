'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center gap-3 transition-colors duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Validating session...</span>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen relative">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/20 dark:bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/20 dark:bg-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Content Area */}
        <div className="p-8 lg:p-10 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
