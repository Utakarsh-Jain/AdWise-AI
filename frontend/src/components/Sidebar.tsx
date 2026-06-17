
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  BarChart3, 
  TrendingUp, 
  Lightbulb, 
  MessageSquare, 
  LogOut, 
  User as UserIcon,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Campaign Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Forecasting', href: '/dashboard/forecast', icon: TrendingUp },
    { name: 'AI Insights', href: '/dashboard/insights', icon: Lightbulb },
    { name: 'AI Chat Analyst', href: '/dashboard/chat', icon: MessageSquare },
    { name: 'AI Ad Generator', href: '/dashboard/ad-generator', icon: Sparkles },
  ];

  return (
    <aside className="w-64 h-screen bg-white/80 dark:bg-slate-950/80 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 flex flex-col justify-between backdrop-blur-md sticky top-0 transition-colors duration-300">
      {/* Brand Logo */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-900">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none bg-gradient-to-r from-slate-800 via-slate-600 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-indigo-400 bg-clip-text text-transparent">
              AdWise AI
            </h1>
            <span className="text-[10px] text-slate-500 tracking-wider font-semibold uppercase">
              Campaign Optimization
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
                isActive
                  ? 'bg-indigo-50/80 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-500 shadow-sm dark:shadow-inner'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'
              }`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Info, Theme & Logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-900 bg-slate-50/40 dark:bg-slate-950/40 space-y-3 transition-colors duration-300">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] text-slate-500 tracking-wider font-semibold uppercase">Theme</span>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {user && (
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="bg-slate-200 dark:bg-slate-800 p-2 rounded-full border border-slate-300 dark:border-slate-700">
              <UserIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-300 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
