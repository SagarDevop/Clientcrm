import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLeads } from '../../hooks/useLeads.js';
import { useServices } from '../../hooks/useServices.js';
import { LEAD_STAGES, formatCurrency, formatDate, getLeadStageBadgeColor, getLeadStageLabel } from '../../utils/formatters.js';
import { LeadFormModal } from '../../components/forms/LeadFormModal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import {
  UserPlus,
  Search,
  Plus,
  Clock,
  Layers,
  List,
  ChevronRight,
} from 'lucide-react';

export function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStage = searchParams.get('stage') || '';

  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState(initialStage);
  const [selectedService, setSelectedService] = useState('');
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' | 'list'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { leads, isLoading } = useLeads({
    stage: selectedStage || undefined,
    serviceId: selectedService || undefined,
    search,
  });

  const { services } = useServices();
  const navigate = useNavigate();

  // Metrics
  const openLeads = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost');
  const pipelineValue = openLeads.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Sales Pipeline & Leads
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {openLeads.length} open prospect{openLeads.length === 1 ? '' : 's'} • Pipeline value:{' '}
            <b className="text-slate-800 dark:text-slate-200">{formatCurrency(pipelineValue)}</b>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View mode toggle */}
          <div className="hidden sm:flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'pipeline'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs'
                  : 'text-slate-500'
              }`}
              title="Pipeline Stage View"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs'
                  : 'text-slate-500'
              }`}
              title="Compact List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs sm:text-sm transition-all shadow-xs min-touch-target"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, company, phone or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
          />
        </div>

        <div className="flex gap-2">
          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => {
              setSelectedStage(e.target.value);
              setSearchParams(e.target.value ? { stage: e.target.value } : {});
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
          >
            <option value="">All Stages</option>
            {LEAD_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Service Filter */}
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
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

      {/* Main Content */}
      {isLoading ? (
        <LoadingSpinner text="Loading sales pipeline..." />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={search ? 'No matching leads' : 'Pipeline is empty'}
          description="Capture incoming inquiries, quotations, and demo statuses to convert more clients."
          actionLabel="Add New Lead"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : viewMode === 'pipeline' && !selectedStage ? (
        /* Grouped Pipeline Stage View */
        <div className="space-y-6">
          {LEAD_STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage.value);
            if (stageLeads.length === 0) return null;

            const stageValue = stageLeads.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);

            return (
              <div key={stage.value} className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${stage.color}`}>
                      {stage.label} ({stageLeads.length})
                    </span>
                    {stageValue > 0 && (
                      <span className="text-xs text-slate-400 font-medium">
                        {formatCurrency(stageValue)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stageLeads.map((lead) => {
                    const leadServices = services.filter((s) => lead.serviceIds?.includes(s.id));

                    return (
                      <div
                        key={lead.id}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 cursor-pointer transition-all shadow-xs group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 transition-colors">
                                {lead.name}
                              </h3>
                              {lead.businessName && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                  {lead.businessName}
                                </p>
                              )}
                            </div>
                            {lead.estimatedValue > 0 && (
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(lead.estimatedValue)}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            {lead.phone && <span>📞 {lead.phone}</span>}
                          </div>

                          {leadServices.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {leadServices.map((srv) => (
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
                          {lead.nextFollowUpAt ? (
                            <span className="flex items-center text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                              <Clock className="w-3 h-3 mr-1" />
                              Follow-up: {formatDate(lead.nextFollowUpAt)}
                            </span>
                          ) : (
                            <span className="text-[11px]">No follow-up set</span>
                          )}

                          <span className="text-brand-600 flex items-center group-hover:translate-x-0.5 transition-transform font-medium">
                            Details <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat List View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => navigate(`/leads/${lead.id}`)}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 cursor-pointer transition-all shadow-xs group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 transition-colors">
                      {lead.name}
                    </h3>
                    {lead.businessName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {lead.businessName}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getLeadStageBadgeColor(lead.stage)}`}>
                    {getLeadStageLabel(lead.stage)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{lead.phone || 'No phone'}</span>
                  {lead.estimatedValue > 0 && (
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(lead.estimatedValue)}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>{lead.source || 'Direct'}</span>
                <span className="text-brand-600 flex items-center group-hover:translate-x-0.5 transition-transform font-medium">
                  Open <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Lead Modal */}
      <LeadFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={(l) => navigate(`/leads/${l.id}`)}
      />
    </div>
  );
}
