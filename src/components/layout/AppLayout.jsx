import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from './Header.jsx';
import { Sidebar } from './Sidebar.jsx';
import { BottomNav } from './BottomNav.jsx';
import { PwaInstallBanner } from '../common/PwaInstallBanner.jsx';
import { GlobalSearchModal } from '../common/GlobalSearchModal.jsx';
import { ClientFormModal } from '../forms/ClientFormModal.jsx';
import { syncLocalToCloud } from '../../db/saasSync.js';

export function AppLayout() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const navigate = useNavigate();

  // Trigger sync on layout mount
  useEffect(() => {
    syncLocalToCloud();
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K for global search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Desktop Sidebar (Fixed / Stuck on Left) */}
      <Sidebar onOpenAddClient={() => setIsAddClientOpen(true)} />

      {/* Main Scrollable Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <PwaInstallBanner />
        <Header
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenAddClient={() => setIsAddClientOpen(true)}
        />

        <main className="flex-1 pb-24 md:pb-8 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav onOpenAddClient={() => setIsAddClientOpen(true)} />
      </div>

      {/* Global Modals */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <ClientFormModal
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        onSaved={(c) => navigate(`/clients/${c.id}`)}
      />
    </div>
  );
}
