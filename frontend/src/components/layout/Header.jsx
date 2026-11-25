import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Search,
  WifiOff,
  Sun,
  Moon,
  Laptop,
  Plus,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme.js';

export function Header({ onOpenSearch, onOpenAddClient }) {
  const { theme, setTheme } = useTheme();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

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

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 pt-safe">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Mobile Left Brand */}
        <div className="flex items-center md:hidden">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-xs mr-2">
            B
          </div>
          <span className="font-bold text-sm tracking-tight text-stone-900 dark:text-stone-100">BizCRM</span>
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
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 dark:text-stone-400 text-xs transition-colors"
          >
            <span className="flex items-center">
              <Search className="w-3.5 h-3.5 mr-2" /> Search clients, business, phone...
            </span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-2">
          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="md:hidden p-2 rounded-xl text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme switcher */}
          <button
            type="button"
            onClick={cycleTheme}
            title={`Current theme: ${theme}. Click to switch.`}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4" />
            ) : theme === 'light' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Laptop className="w-4 h-4" />
            )}
          </button>

          {/* Direct Add Client CTA in Header */}
          <button
            type="button"
            onClick={onOpenAddClient}
            className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Client</span>
          </button>
        </div>
      </div>
    </header>
  );
}
