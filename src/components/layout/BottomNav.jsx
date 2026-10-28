import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Plus, Settings } from 'lucide-react';

export function BottomNav({ onOpenAddClient }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 pb-safe md:hidden">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        {/* Dashboard */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Dashboard</span>
        </NavLink>

        {/* Clients */}
        <NavLink
          to="/clients"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`
          }
        >
          <Users className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Clients</span>
        </NavLink>

        {/* Center Prominent Add Client Button */}
        <div className="flex-1 flex justify-center">
          <button
            type="button"
            onClick={onOpenAddClient}
            className="w-12 h-12 -mt-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/20 flex items-center justify-center transition-colors"
            aria-label="Add new client"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`
          }
        >
          <Settings className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}
