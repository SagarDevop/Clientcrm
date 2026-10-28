import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from './Header.jsx';
import { Sidebar } from './Sidebar.jsx';
import { BottomNav } from './BottomNav.jsx';
import { PwaInstallBanner } from '../common/PwaInstallBanner.jsx';
import { GlobalSearchModal } from '../common/GlobalSearchModal.jsx';
import { ClientFormModal } from '../forms/ClientFormModal.jsx';

export function AppLayout() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const navigate = useNavigate();

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
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Desktop Sidebar */}
      <Sidebar onOpenAddClient={() => setIsAddClientOpen(true)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <PwaInstallBanner />
        <Header
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenAddClient={() => setIsAddClientOpen(true)}
        />

        <main className="flex-1 pb-24 md:pb-8 p-4 sm:p-6 max-w-6xl w-full mx-auto">
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
