import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Plus, UserPlus, CheckSquare } from 'lucide-react';

export function BottomNav({ onOpenQuickAction }) {
  const navItems = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/clients', label: 'Clients', icon: Users },
    // Center Quick Action Button is rendered separately
    { to: '/leads', label: 'Leads', icon: UserPlus },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe md:hidden">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {/* Home */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full min-touch-target transition-colors ${
              isActive
                ? 'text-brand-600 dark:text-brand-400 font-medium'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Home</span>
        </NavLink>

        {/* Clients */}
        <NavLink
          to="/clients"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full min-touch-target transition-colors ${
              isActive
                ? 'text-brand-600 dark:text-brand-400 font-medium'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`
          }
        >
          <Users className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Clients</span>
        </NavLink>

        {/* Center Prominent Add Button */}
        <div className="flex-1 flex justify-center">
          <button
            type="button"
            onClick={onOpenQuickAction}
            className="w-12 h-12 -mt-5 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-950/20 flex items-center justify-center transition-colors min-touch-target"
            aria-label="Create new record"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Leads */}
        <NavLink
          to="/leads"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full min-touch-target transition-colors ${
              isActive
                ? 'text-brand-600 dark:text-brand-400 font-medium'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`
          }
        >
          <UserPlus className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Leads</span>
        </NavLink>

        {/* Tasks */}
        <NavLink
          to="/tasks"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full min-touch-target transition-colors ${
              isActive
                ? 'text-brand-600 dark:text-brand-400 font-medium'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`
          }
        >
          <CheckSquare className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Tasks</span>
        </NavLink>
      </div>
    </nav>
  );
}
