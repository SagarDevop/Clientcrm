import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  Plus,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme.js';

export function Sidebar({ onOpenAddClient }) {
  const { theme, setTheme } = useTheme();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/clients', label: 'Active Clients', icon: Users },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 h-screen sticky top-0 flex-shrink-0 z-30">
      {/* Brand Header */}
      <div className="flex items-center px-5 h-16 border-b border-stone-100 dark:border-stone-800">
        <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs mr-3">
          B
        </div>
        <div>
          <div className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight">BizCRM</div>
          <p className="text-[11px] text-stone-400 font-medium">Client & Plan Tracker</p>
        </div>
      </div>

      {/* Add Client CTA */}
      <div className="p-4">
        <button
          type="button"
          onClick={onOpenAddClient}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200'
                  }`
                }
              >
                <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / Theme Switcher */}
      <div className="p-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
        <div className="flex items-center space-x-2 pl-2">
          <div className="w-2 h-2 rounded-full bg-emerald-600" />
          <span className="text-[11px] text-stone-400 font-medium">Private Local-First</span>
        </div>
        <button
          type="button"
          onClick={cycleTheme}
          title={`Current theme: ${theme}. Click to switch.`}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4" />
          ) : theme === 'light' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Laptop className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
