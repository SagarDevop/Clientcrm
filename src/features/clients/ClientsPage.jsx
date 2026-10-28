import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../../hooks/useClients.js';
import { ClientFormModal } from '../../components/forms/ClientFormModal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { Users, Search, Plus, ChevronRight, Calendar, DollarSign, Clock } from 'lucide-react';

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'completed' | 'inactive' | ''
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { clients, isLoading } = useClients({
    status: statusFilter,
    search,
  });

  const navigate = useNavigate();

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Active Clients
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {clients.length} {statusFilter || 'total'} client{clients.length === 1 ? '' : 's'} • 1-month service plans & payments
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-xs"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, business, phone or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="active">Active Clients</option>
            <option value="completed">Completed Periods</option>
            <option value="inactive">Inactive</option>
            <option value="">All Clients</option>
          </select>
        </div>
      </div>

      {/* Clients Cards Grid */}
      {isLoading ? (
        <LoadingSpinner text="Loading client plans..." />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'No matching clients found' : 'No clients in this view'}
          description={
            search
              ? `No client matches "${search}". Try searching another name or phone.`
              : 'Add your active clients to track their 1-month service plans, token payments, and automatic emails.'
          }
          actionLabel="Add First Client"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {clients.map((client) => {
            const plan = Number(client.monthlyPlanAmount || 0);
            const token = Number(client.tokenPaid || 0);
            const additional = Number(client.additionalPaid || 0);
            const totalRecv = Number(client.totalPaid || token + additional);
            const remaining = Number(client.remainingAmount !== undefined ? client.remainingAmount : plan - totalRecv);

            const isPaid = remaining <= 0;
            const isPartiallyPaid = !isPaid && totalRecv > 0;

            return (
              <div
                key={client.id}
                onClick={() => navigate(`/clients/${client.id}`)}
                className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-500 cursor-pointer transition-all shadow-xs group flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {client.name}
                      </h2>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                        {client.businessName}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : isPartiallyPaid
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {isPaid ? 'Paid' : isPartiallyPaid ? 'Partially Paid' : 'Unpaid'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          client.status === 'active'
                            ? 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300'
                            : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {client.status}
                      </span>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 flex flex-wrap gap-x-3">
                    <span>✉️ {client.email}</span>
                    <span>📞 {client.phone}</span>
                  </div>

                  {/* Financial & Plan Figures Grid */}
                  <div className="mt-3 grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase">Monthly Plan</span>
                      <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                        ₹{plan.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase">Received</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{totalRecv.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase">Remaining</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        ₹{remaining.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dates & Footer */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-stone-400" />
                    <span>
                      {client.startDate || '—'} &rarr; <strong>{client.completionDate || '—'}</strong>
                    </span>
                  </div>
                  <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    View &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Client Modal */}
      <ClientFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={(c) => navigate(`/clients/${c.id}`)}
      />
    </div>
  );
}
