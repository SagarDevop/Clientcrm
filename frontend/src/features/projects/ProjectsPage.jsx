import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects.js';
import { useClients } from '../../hooks/useClients.js';
import { useServices } from '../../hooks/useServices.js';
import { formatCurrency, formatDate, PROJECT_STATUSES } from '../../utils/formatters.js';
import { ProjectFormModal } from '../../components/forms/ProjectFormModal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import {
  FolderKanban,
  Plus,
  Calendar,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Clock,
} from 'lucide-react';

export function ProjectsPage() {
  const [statusFilter, setStatusFilter] = useState('active');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { projects, isLoading } = useProjects({
    status: statusFilter || undefined,
  });

  const { clients } = useClients();
  const { services } = useServices();
  const navigate = useNavigate();

  const getClientName = (clientId) => {
    const c = clients.find((client) => client.id === clientId);
    return c ? c.name : 'Unknown Client';
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Client Projects & Engagements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {projects.length} {statusFilter} project{projects.length === 1 ? '' : 's'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs sm:text-sm transition-all shadow-xs min-touch-target"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setStatusFilter('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-touch-target ${
            statusFilter === 'active'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Active Projects
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('planned')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-touch-target ${
            statusFilter === 'planned'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Planned
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('waiting_for_client')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-touch-target ${
            statusFilter === 'waiting_for_client'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Waiting for Client
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-touch-target ${
            statusFilter === 'completed'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Completed
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-touch-target ${
            statusFilter === ''
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          All
        </button>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <LoadingSpinner text="Loading projects..." />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="Create projects with starter checklist templates for content production, web apps, ads, and SEO."
          actionLabel="Create Project"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => {
            const clientName = getClientName(proj.clientId);
            const projServices = services.filter((s) => proj.serviceIds?.includes(s.id));

            return (
              <div
                key={proj.id}
                onClick={() => navigate(`/projects/${proj.id}`)}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 cursor-pointer transition-all shadow-xs group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 transition-colors">
                        {proj.name}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        Client: {clientName}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                      {proj.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {proj.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>
                  )}

                  {projServices.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {projServices.map((srv) => (
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

                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Agreed Value</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(proj.agreedAmount)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Deadline</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(proj.deadline)}
                    </span>
                  </div>

                  <span className="text-brand-600 dark:text-brand-400 font-medium flex items-center group-hover:translate-x-0.5 transition-transform">
                    Deliverables <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Form Modal */}
      <ProjectFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={(p) => navigate(`/projects/${p.id}`)}
      />
    </div>
  );
}
