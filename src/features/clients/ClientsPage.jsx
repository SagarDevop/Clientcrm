import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../../hooks/useClients.js';
import { useServices } from '../../hooks/useServices.js';
import { ClientFormModal } from '../../components/forms/ClientFormModal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import {
  Users,
  Search,
  Plus,
  ChevronRight,
} from 'lucide-react';

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [serviceFilter, setServiceFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { clients, isLoading } = useClients({
    status: statusFilter,
    serviceId: serviceFilter,
    search,
  });

  const { services } = useServices();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Page Title & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Client Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {clients.length} {statusFilter} client{clients.length === 1 ? '' : 's'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs sm:text-sm transition-all shadow-xs min-touch-target"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, phone or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
          />
        </div>

        <div className="flex gap-2">
          {/* Status Tabs */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
          >
            <option value="active">Active Clients</option>
            <option value="paused">Paused Clients</option>
            <option value="archived">Archived</option>
            <option value="">All Statuses</option>
          </select>

          {/* Service Filter */}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
          >
            <option value="">All Services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clients List */}
      {isLoading ? (
        <LoadingSpinner text="Loading clients..." />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'No matching clients found' : 'No clients in this view'}
          description={
            search
              ? `No client matches "${search}". Try searching another name or phone.`
              : 'Add clients directly or convert won prospects from the sales pipeline.'
          }
          actionLabel="Add Client"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clients.map((client) => {
            const clientServices = services.filter((s) => client.serviceIds?.includes(s.id));

            return (
              <div
                key={client.id}
                onClick={() => navigate(`/clients/${client.id}`)}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 cursor-pointer transition-all shadow-xs group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {client.name}
                      </h2>
                      {client.businessName && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {client.businessName}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                        client.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : client.status === 'paused'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {client.phone && <span>📞 {client.phone}</span>}
                    {client.email && <span>✉️ {client.email}</span>}
                  </div>

                  {/* Retained Services Chips */}
                  {clientServices.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {clientServices.map((srv) => (
                        <span
                          key={srv.id}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {srv.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Joined {new Date(client.createdAt).toLocaleDateString()}</span>
                  <span className="flex items-center text-brand-600 dark:text-brand-400 font-medium group-hover:translate-x-0.5 transition-transform">
                    View profile <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
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
