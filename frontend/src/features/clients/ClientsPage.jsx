import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../../hooks/useClients.js';
import { ClientFormModal } from '../../components/forms/ClientFormModal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { WhatsAppModal } from '../../components/common/WhatsAppModal.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Plus,
  ChevronRight,
  Calendar,
  DollarSign,
  Clock,
  Share2,
  Code,
  Layers,
  ArrowRight,
  Sparkles,
  Trash2,
} from 'lucide-react';

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'completed' | 'inactive' | ''
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'content_management' | 'web_development'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWhatsAppClient, setSelectedWhatsAppClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);

  const { clients, isLoading, deleteClient } = useClients({
    status: statusFilter,
    search,
  });

  const handleDeleteSingleClient = async () => {
    if (!clientToDelete) return;
    try {
      await deleteClient(clientToDelete.id);
      setClientToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete client');
    }
  };

  const navigate = useNavigate();

  // Filter clients by type
  const filteredClients = clients.filter((c) => {
    if (typeFilter === 'all') return true;
    const isWeb = c.clientType === 'web_development' || c.category === 'web_dev';
    return typeFilter === 'web_development' ? isWeb : !isWeb;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-2">
      {/* Header with Framer Motion */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
              Agency Accounts
            </span>
            <span className="text-xs text-stone-400">• Total {filteredClients.length} Records</span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight mt-1">
            Client Directory & Agreements
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Full enterprise records, payment milestones, line-item quotations, and instant communication triggers.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-emerald-600/25 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Client</span>
        </motion.button>
      </motion.div>

      {/* Search and Filters Bar with Smooth Motion */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-3"
      >
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by client, business name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Type Filter Pills with Liquid Slider Motion */}
          <div className="flex items-center space-x-1 p-1 rounded-2xl bg-stone-100/80 dark:bg-stone-800/80 text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`relative px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                typeFilter === 'all'
                  ? 'text-stone-900 dark:text-stone-100'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {typeFilter === 'all' && (
                <motion.div
                  layoutId="activeClientTypePill"
                  className="absolute inset-0 bg-white dark:bg-stone-900 rounded-xl shadow-xs"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">All Types</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('web_development')}
              className={`relative px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                typeFilter === 'web_development'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {typeFilter === 'web_development' && (
                <motion.div
                  layoutId="activeClientTypePill"
                  className="absolute inset-0 bg-white dark:bg-stone-900 rounded-xl shadow-xs"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">Web Dev</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('content_management')}
              className={`relative px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                typeFilter === 'content_management'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {typeFilter === 'content_management' && (
                <motion.div
                  layoutId="activeClientTypePill"
                  className="absolute inset-0 bg-white dark:bg-stone-900 rounded-xl shadow-xs"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">Content Plans</span>
            </button>
          </div>

          {/* Status Filter with Liquid Motion */}
          <div className="flex items-center space-x-1 p-1 rounded-2xl bg-stone-100/80 dark:bg-stone-800/80 text-xs">
            {['active', 'completed', 'inactive'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`relative px-3.5 py-1.5 rounded-xl font-bold capitalize transition-all ${
                  statusFilter === st
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {statusFilter === st && (
                  <motion.div
                    layoutId="activeStatusPill"
                    className="absolute inset-0 bg-white dark:bg-stone-900 rounded-xl shadow-xs"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{st}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Clients List with Framer Motion Grid */}
      {isLoading ? (
        <LoadingSpinner text="Loading clients..." size="md" className="py-12" />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients found"
          description="Get started by onboarding your first client."
          actionLabel="Add Client"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredClients.map((client) => {
            const isWeb = client.clientType === 'web_development' || client.category === 'web_dev';
            const cost = Number(
              isWeb ? client.totalProjectCost || client.agreedAmount || 0 : client.monthlyPlanAmount || 0
            );
            const paid = Number(
              client.totalPaid ||
                (Number(client.tokenPaid || client.advancePaid) || 0) + (Number(client.additionalPaid) || 0)
            );
            const remaining = Number(
              client.remainingAmount !== undefined ? client.remainingAmount : Math.max(0, cost - paid)
            );
            const isFullyPaid = remaining <= 0;

            return (
              <motion.div
                key={client.id}
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{ y: -5, transition: { duration: 0.18 } }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/clients/${client.id}`)}
                className="saas-card-glow p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:border-emerald-500/80 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 relative overflow-hidden group flex flex-col justify-between transition-all"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isWeb
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50'
                      }`}
                    >
                      {isWeb ? 'Web Dev Project' : 'Content Retainer'}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        client.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : client.status === 'completed'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>

                  {/* Client Info */}
                  <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 transition-colors">
                    {client.name}
                  </h3>
                  <div className="text-xs text-stone-400 font-medium">{client.businessName || 'Independent'}</div>

                  {/* Financial Summary */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500 font-medium">Contract Value</span>
                      <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                        ₹{cost.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500 font-medium">Remaining Due</span>
                      <span
                        className={`font-mono font-bold ${
                          isFullyPaid ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        ₹{remaining.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400">
                    {isWeb ? `Delivery: ${client.deliveryDate || '—'}` : `Renewal: ${client.completionDate || '—'}`}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWhatsAppClient(client);
                      }}
                      className="p-1.5 rounded-xl text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                      title="WhatsApp Notice"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientToDelete(client);
                      }}
                      className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Single Client"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Add Client Full PC Modal */}
      <ClientFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={(c) => navigate(`/clients/${c.id}`)}
      />

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 max-w-md w-full border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Delete Client "{clientToDelete.name}"?
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Are you sure you want to permanently delete this client and all their linked records (projects, payments, quotations)? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSingleClient}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md transition-colors"
              >
                Yes, Delete Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={Boolean(selectedWhatsAppClient)}
        onClose={() => setSelectedWhatsAppClient(null)}
        client={selectedWhatsAppClient}
      />
    </div>
  );
}
