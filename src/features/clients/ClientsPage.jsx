import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../../hooks/useClients.js';
import { ClientFormModal } from '../../components/forms/ClientFormModal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { WhatsAppModal } from '../../components/common/WhatsAppModal.jsx';
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
} from 'lucide-react';

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'completed' | 'inactive' | ''
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'content_management' | 'web_development'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWhatsAppClient, setSelectedWhatsAppClient] = useState(null);

  const { clients, isLoading } = useClients({
    status: statusFilter,
    search,
  });

  const navigate = useNavigate();

  // Filter clients by type
  const filteredClients = clients.filter((c) => {
    if (typeFilter === 'all') return true;
    const isWeb = c.clientType === 'web_development' || c.category === 'web_dev';
    return typeFilter === 'web_development' ? isWeb : !isWeb;
  });

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Client Directory
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {filteredClients.length} {statusFilter || 'total'} client{filteredClients.length === 1 ? '' : 's'} • Content management plans & web dev projects
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
          {/* Client Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="content_management">Content Management</option>
            <option value="web_development">Web Development</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="inactive">Inactive</option>
            <option value="">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Clients Cards Grid */}
      {isLoading ? (
        <LoadingSpinner text="Loading client roster..." />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'No matching clients found' : 'No clients in this view'}
          description={
            search
              ? `No client matches "${search}". Try searching another name or phone.`
              : 'Add your active clients to track monthly service retainers or web development projects.'
          }
          actionLabel="Add First Client"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredClients.map((client) => {
            const isWebDev = client.clientType === 'web_development' || client.category === 'web_dev';
            const cost = Number(isWebDev ? (client.totalProjectCost || client.agreedAmount || 0) : (client.monthlyPlanAmount || 0));
            const token = Number(client.tokenPaid || client.advancePaid || 0);
            const additional = Number(client.additionalPaid || 0);
            const totalRecv = Number(client.totalPaid || token + additional);
            const remaining = Number(
              client.remainingAmount !== undefined ? client.remainingAmount : Math.max(0, cost - totalRecv)
            );

            const isPaid = remaining <= 0;
            const isPartiallyPaid = !isPaid && totalRecv > 0;

            return (
              <div
                key={client.id}
                onClick={() => navigate(`/clients/${client.id}`)}
                className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-500 cursor-pointer transition-all shadow-xs group flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {client.name}
                        </h2>
                        {/* Client Type Indicator */}
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 ${
                            isWebDev
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {isWebDev ? <Code className="w-2.5 h-2.5" /> : <Layers className="w-2.5 h-2.5" />}
                          <span>{isWebDev ? 'Web Dev' : 'Content'}</span>
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                        {client.businessName} {isWebDev && client.projectName ? `• ${client.projectName}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : isPartiallyPaid
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {isPaid ? 'Paid' : isPartiallyPaid ? 'Partial' : 'Unpaid'}
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
                      <span className="text-[10px] text-stone-400 block uppercase">
                        {isWebDev ? 'Project Cost' : 'Monthly Plan'}
                      </span>
                      <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                        ₹{cost.toLocaleString()}
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
                      {isWebDev ? (
                        <>
                          Delivery: <strong className="text-stone-700 dark:text-stone-300">{client.deliveryDate || client.completionDate || '—'}</strong>
                        </>
                      ) : (
                        <>
                          {client.startDate || '—'} &rarr; <strong className="text-stone-700 dark:text-stone-300">{client.completionDate || '—'}</strong>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWhatsAppClient(client);
                      }}
                      className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                      title="Send WhatsApp message"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                      View &rarr;
                    </span>
                  </div>
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

      {/* 3-in-1 WhatsApp Smart Messenger Modal */}
      <WhatsAppModal
        isOpen={Boolean(selectedWhatsAppClient)}
        onClose={() => setSelectedWhatsAppClient(null)}
        client={selectedWhatsAppClient}
        defaultTemplate={
          selectedWhatsAppClient && (selectedWhatsAppClient.clientType === 'web_development' || selectedWhatsAppClient.category === 'web_dev')
            ? 'quotation'
            : selectedWhatsAppClient && Number(selectedWhatsAppClient.remainingAmount || 0) > 0
            ? 'balance'
            : 'renewal'
        }
      />
    </div>
  );
}
