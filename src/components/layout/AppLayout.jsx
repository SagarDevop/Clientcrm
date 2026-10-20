import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from './Header.jsx';
import { Sidebar } from './Sidebar.jsx';
import { BottomNav } from './BottomNav.jsx';
import { PwaInstallBanner } from '../common/PwaInstallBanner.jsx';
import { GlobalSearchModal } from '../common/GlobalSearchModal.jsx';
import { QuickActionModal } from '../common/QuickActionModal.jsx';
import { ClientFormModal } from '../forms/ClientFormModal.jsx';
import { LeadFormModal } from '../forms/LeadFormModal.jsx';
import { TaskFormModal } from '../forms/TaskFormModal.jsx';
import { InteractionFormModal } from '../forms/InteractionFormModal.jsx';
import { PaymentFormModal } from '../forms/PaymentFormModal.jsx';
import { reminderEngine } from '../../services/reminderEngine.js';

export function AppLayout() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  // Form Modals state
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isLogInteractionOpen, setIsLogInteractionOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  const navigate = useNavigate();

  // Start in-app reminder engine
  useEffect(() => {
    reminderEngine.start();
    return () => reminderEngine.stop();
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <Sidebar onOpenQuickAction={() => setIsQuickActionOpen(true)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <PwaInstallBanner />
        <Header
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenQuickAction={() => setIsQuickActionOpen(true)}
        />

        <main className="flex-1 pb-24 md:pb-8 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav onOpenQuickAction={() => setIsQuickActionOpen(true)} />
      </div>

      {/* Global Modals */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        onOpenAddClient={() => setIsAddClientOpen(true)}
        onOpenAddLead={() => setIsAddLeadOpen(true)}
        onOpenAddTask={() => setIsAddTaskOpen(true)}
        onOpenLogInteraction={() => setIsLogInteractionOpen(true)}
        onOpenRecordPayment={() => setIsRecordPaymentOpen(true)}
      />

      <ClientFormModal
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        onSaved={(c) => navigate(`/clients/${c.id}`)}
      />

      <LeadFormModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        onSaved={(l) => navigate(`/leads/${l.id}`)}
      />

      <TaskFormModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onSaved={() => navigate('/tasks')}
      />

      <InteractionFormModal
        isOpen={isLogInteractionOpen}
        onClose={() => setIsLogInteractionOpen(false)}
      />

      <PaymentFormModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onSaved={() => navigate('/payments')}
      />
    </div>
  );
}
