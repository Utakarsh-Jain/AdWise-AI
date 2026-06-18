
'use client';

import React, { useState } from 'react';
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
  Moon,
  Menu,
  X
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Campaign Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Forecasting', href: '/dashboard/forecast', icon: TrendingUp },
    { name: 'AI Insights', href: '/dashboard/insights', icon: Lightbulb },
    { name: 'AI Chat Analyst', href: '/dashboard/chat', icon: MessageSquare },
    { name: 'AI Ad Generator', href: '/dashboard/ad-generator', icon: Sparkles },
  ];

  const sidebarContent = (
    <>
      {/* Brand Logo */}
      <div className="p-5 border-b border-zinc-300 dark:border-zinc-600">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 dark:bg-zinc-800 flex items-center justify-center border border-zinc-800/20 dark:border-zinc-600/50">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none text-zinc-900 dark:text-white">
              AdWise AI
            </h1>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tracking-wider font-medium">
              Campaign Optimization
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50/40 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${
                isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'
              }`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Info, Theme & Logout */}
      <div className="p-3 border-t border-zinc-300 dark:border-zinc-600 space-y-2">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tracking-wider font-semibold uppercase">Theme</span>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {theme === 'light' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>

        {user && (
          <div className="flex items-center gap-3 px-3 py-1.5">
            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        
        <button
          onClick={() => { logout(); setMobileOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-zinc-950 border-b border-zinc-300 dark:border-zinc-600 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-zinc-950 dark:bg-zinc-800 flex items-center justify-center border border-zinc-800/10">
            <BarChart3 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-zinc-900 dark:text-white font-bold text-sm">AdWise AI</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside className={`md:hidden fixed top-0 left-0 z-40 h-full w-72 bg-white dark:bg-zinc-950 border-r border-zinc-300 dark:border-zinc-600 flex flex-col transform transition-transform duration-200 ease-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 h-screen bg-white dark:bg-zinc-950 border-r border-zinc-300 dark:border-zinc-600 flex-col sticky top-0 transition-colors">
        {sidebarContent}
      </aside>
    </>
  );
}
