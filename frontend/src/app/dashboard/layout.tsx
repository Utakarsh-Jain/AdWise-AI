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
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col justify-center items-center gap-3 transition-colors">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Validating session...</span>
      </div>
    );
  }

  return (
    <div className="flex bg-zinc-50 dark:bg-zinc-950 min-h-screen transition-colors">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        {/* Content Area — pt-16 on mobile to clear the fixed top bar */}
        <div className="p-4 pt-16 sm:p-6 sm:pt-16 md:p-8 md:pt-8 lg:p-10 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
