import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Search,
  Bell,
  Menu,
  X,
  WifiOff,
  Sun,
  Moon,
  FolderKanban,
  DollarSign,
  Briefcase,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme.js';
import { useReminders } from '../../hooks/useReminders.js';

export function Header({ onOpenSearch, onOpenQuickAction }) {
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const { reminders } = useReminders({ status: 'scheduled' });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const moreNavLinks = [
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/payments', label: 'Payments', icon: DollarSign },
    { to: '/services', label: 'Services', icon: Briefcase },
    { to: '/reminders', label: 'Reminders', icon: Bell },
    { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
    { to: '/settings', label: 'Settings & Data', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 pt-safe">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Mobile Left Brand */}
        <div className="flex items-center md:hidden">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-xs shadow-xs mr-2">
            B
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">BizCRM</span>
          {!isOnline && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              <WifiOff className="w-2.5 h-2.5 mr-0.5" /> Offline
            </span>
          )}
        </div>

        {/* Desktop Search Bar Trigger */}
        <div className="hidden md:flex items-center flex-1 max-w-md">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 rounded-xl border border-transparent transition-colors"
          >
            <span className="flex items-center">
              <Search className="w-3.5 h-3.5 mr-2 text-slate-400" />
              Search clients, leads, tasks...
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-slate-400">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-touch-target flex items-center justify-center"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Reminders / Notifications Link */}
          <NavLink
            to="/reminders"
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-touch-target flex items-center justify-center transition-colors"
            aria-label="Reminders"
          >
            <Bell className="w-5 h-5" />
            {reminders.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </NavLink>

          {/* Theme switcher on mobile */}
          <button
            type="button"
            onClick={cycleTheme}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-touch-target flex items-center justify-center"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {/* Mobile Secondary Menu Hamburger */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-touch-target flex items-center justify-center"
            aria-label="More navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Secondary Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            More Sections
          </div>
          {moreNavLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="w-4 h-4 mr-3 text-slate-500" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </header>
  );
}
