import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CheckSquare,
  FolderKanban,
  DollarSign,
  Briefcase,
  Bell,
  BarChart3,
  Settings,
  Plus,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme.js';

export function Sidebar({ onOpenQuickAction }) {
  const { theme, setTheme } = useTheme();

  const mainNav = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/clients', label: 'Clients', icon: Users },
    { to: '/leads', label: 'Leads & Pipeline', icon: UserPlus },
    { to: '/tasks', label: 'Daily Tasks', icon: CheckSquare },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/payments', label: 'Payments', icon: DollarSign },
  ];

  const secondaryNav = [
    { to: '/services', label: 'Services', icon: Briefcase },
    { to: '/reminders', label: 'Reminders', icon: Bell },
    { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
    { to: '/settings', label: 'Settings & Data', icon: Settings },
  ];

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-screen sticky top-0 flex-shrink-0 z-30">
      {/* Brand Header */}
      <div className="flex items-center px-6 h-16 border-b border-slate-100 dark:border-slate-800">
        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-sm shadow-xs mr-3">
          B
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">BizCRM</div>
          <p className="text-[11px] text-slate-400 font-medium">Personal Business Suite</p>
        </div>
      </div>

      {/* Quick Add CTA */}
      <div className="p-4">
        <button
          type="button"
          onClick={onOpenQuickAction}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm shadow-sm transition-all min-touch-target"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Quick Action</span>
        </button>
      </div>

      {/* Nav Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Main Management
          </div>
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
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

        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Overview & Tools
          </div>
          <nav className="space-y-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
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
      </div>

      {/* Footer Profile / Theme Switcher */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2 pl-2">
          <div className="w-2 h-2 rounded-full bg-brand-600" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Local-first PWA</span>
        </div>
        <button
          type="button"
          onClick={cycleTheme}
          title={`Current theme: ${theme}. Click to switch.`}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
