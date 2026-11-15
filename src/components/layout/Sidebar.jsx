import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  Plus,
  Sun,
  Moon,
  Laptop,
  LogOut,
  Building,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar({ onOpenAddClient }) {
  const { theme, setTheme } = useTheme();
  const { user, tenant, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/clients', label: 'Active Clients', icon: Users },
    { to: '/finance', label: 'Growth & Finance', icon: TrendingUp },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 76 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="hidden md:flex flex-col border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 h-screen sticky top-0 flex-shrink-0 z-30 select-none relative"
    >
      {/* Collapse / Expand Toggle Arrow Button */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse to Icons'}
        className="absolute -right-3.5 top-5 w-7 h-7 rounded-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 shadow-md flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-emerald-600 hover:border-emerald-500 transition-all z-40 cursor-pointer"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        ) : (
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        )}
      </button>

      {/* Brand Header */}
      <div className="flex items-center px-4 h-16 border-b border-stone-100 dark:border-stone-800 overflow-hidden">
        <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-emerald-600/25 flex-shrink-0 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
          <Building className="w-5 h-5" />
        </div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="ml-3 truncate"
            >
              <div className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight truncate">
                {tenant?.name || 'Jugarr Agency'}
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                {tenant?.plan || 'PRO'} SAAS
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Client CTA */}
      <div className="p-3">
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={onOpenAddClient}
          title="Add Client"
          className={`flex items-center justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all ${
            isCollapsed ? 'w-11 h-11 mx-auto p-0' : 'w-full py-2.5 px-4 space-x-2'
          }`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          {!isCollapsed && <span>Add Client</span>}
        </motion.button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 custom-scrollbar">
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-2xl text-xs font-semibold transition-all relative ${
                    isCollapsed ? 'justify-center w-11 h-11 mx-auto' : 'px-3.5 py-2.5'
                  } ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100/80 dark:hover:bg-stone-800/80 hover:text-stone-900 dark:hover:text-stone-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 flex-shrink-0 ${!isCollapsed ? 'mr-3' : ''} ${isActive ? 'text-emerald-600' : ''}`} />
                    {!isCollapsed && <span>{item.label}</span>}
                    {isActive && (
                      <motion.div
                        layoutId="activeSidebarIndicator"
                        className="absolute left-1 top-2 bottom-2 w-1 bg-emerald-600 rounded-full"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Info & SaaS Status */}
      {user && (
        <div
          className={`mx-2.5 mb-2 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 flex items-center transition-all ${
            isCollapsed ? 'justify-center p-2.5' : 'p-3 justify-between'
          }`}
        >
          {!isCollapsed ? (
            <>
              <div className="truncate mr-2">
                <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{user.name}</div>
                <div className="text-[10px] text-stone-400 truncate">{user.email}</div>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                className="p-1.5 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={logout}
              title={`Logged in as ${user.name} (${user.email}) - Click to Sign Out`}
              className="p-1.5 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Footer / Theme Switcher */}
      <div
        className={`p-3 border-t border-stone-100 dark:border-stone-800 flex items-center transition-all ${
          isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'
        }`}
      >
        <div className="flex items-center space-x-2 pl-1" title="SaaS Cloud Active">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          {!isCollapsed && (
            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">SaaS Cloud Active</span>
          )}
        </div>
        <button
          type="button"
          onClick={cycleTheme}
          title={`Theme: ${theme}. Click to switch.`}
          className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
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
    </motion.aside>
  );
}
