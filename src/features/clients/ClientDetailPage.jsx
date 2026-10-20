import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClient } from '../../hooks/useClients.js';
import { useServices } from '../../hooks/useServices.js';
import { useProjects } from '../../hooks/useProjects.js';
import { useTasks } from '../../hooks/useTasks.js';
import { useInteractions } from '../../hooks/useInteractions.js';
import { useFinancialSummary } from '../../hooks/usePayments.js';
import { formatCurrency, formatDate, formatRelativeDate } from '../../utils/formatters.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { ClientFormModal } from '../../components/forms/ClientFormModal.jsx';
import { InteractionFormModal } from '../../components/forms/InteractionFormModal.jsx';
import { TaskFormModal } from '../../components/forms/TaskFormModal.jsx';
import { ProjectFormModal } from '../../components/forms/ProjectFormModal.jsx';
import { PaymentFormModal } from '../../components/forms/PaymentFormModal.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import {
  ArrowLeft,
  Edit2,
  Archive,
  RotateCcw,
  Phone,
  MessageCircle,
  Mail,
  Plus,
  FolderKanban,
  CheckSquare,
  DollarSign,
  Clock,
  ChevronRight,
} from 'lucide-react';

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { client, isLoading, archiveClient, restoreClient } = useClient(id);
  const { services } = useServices();
  const { projects } = useProjects({ clientId: id });
  const { tasks, completeTask } = useTasks({ clientId: id });
  const { interactions } = useInteractions({ clientId: id });
  const financialSummary = useFinancialSummary({ clientId: id });

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogInteractionOpen, setIsLogInteractionOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  // Active tab on mobile/desktop
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'tasks' | 'timeline' | 'finances' | 'notes'

  if (isLoading) {
    return <LoadingSpinner text="Loading client profile..." size="lg" className="min-h-[50vh]" />;
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Client Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">This record may have been deleted or does not exist.</p>
        <button
          onClick={() => navigate('/clients')}
          className="mt-4 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl"
        >
          Back to Clients
        </button>
      </div>
    );
  }

  const clientServices = services.filter((s) => client.serviceIds?.includes(s.id));

  // Phone Call & WhatsApp intent helpers
  const handleCall = () => {
    if (!client.phone) return;
    window.location.href = `tel:${client.phone}`;
    setTimeout(() => setIsLogInteractionOpen(true), 1200);
  };

  const handleWhatsApp = () => {
    if (!client.normalizedPhone) return;
    window.open(`https://wa.me/${client.normalizedPhone}`, '_blank');
    setTimeout(() => setIsLogInteractionOpen(true), 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header Back & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 min-touch-target"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Clients
        </button>

        <div className="flex items-center space-x-2">
          {client.status === 'archived' ? (
            <button
              type="button"
              onClick={() => restoreClient()}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 min-touch-target flex items-center"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restore Client
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsArchiveConfirmOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 min-touch-target flex items-center"
            >
              <Archive className="w-3.5 h-3.5 mr-1.5" /> Archive
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium min-touch-target flex items-center shadow-xs"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
          </button>
        </div>
      </div>

      {/* Main Client Profile Hero Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{client.name}</h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${
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

            {client.businessName && (
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {client.businessName}
              </p>
            )}

            {client.source && (
              <p className="text-xs text-slate-400 mt-1">Source: {client.source}</p>
            )}
          </div>

          {/* Quick Contact Buttons (Phone / WhatsApp / Email) */}
          <div className="flex flex-wrap gap-2">
            {client.phone && (
              <>
                <button
                  type="button"
                  onClick={handleCall}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center min-touch-target"
                >
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                  Call
                </button>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center min-touch-target border border-emerald-200 dark:border-emerald-800"
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  WhatsApp
                </button>
              </>
            )}
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center min-touch-target"
              >
                <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Email
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsLogInteractionOpen(true)}
              className="px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-medium flex items-center min-touch-target border border-purple-200 dark:border-purple-800"
            >
              + Log Interaction
            </button>
          </div>
        </div>

        {/* Retained Services */}
        {clientServices.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
              Retained Services
            </span>
            <div className="flex flex-wrap gap-1.5">
              {clientServices.map((srv) => (
                <span
                  key={srv.id}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-100 dark:border-brand-900/40"
                >
                  {srv.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Financial Summary Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div>
          <span className="text-[11px] font-medium text-slate-400">Total Contracted</span>
          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(financialSummary.agreedAmount)}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-400">Net Payments</span>
          <div className="text-base sm:text-lg font-bold text-emerald-600">
            {formatCurrency(financialSummary.netReceived)}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-400">Outstanding Balance</span>
          <div className="text-base sm:text-lg font-bold text-amber-600">
            {formatCurrency(financialSummary.outstanding)}
          </div>
        </div>
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setIsRecordPaymentOpen(true)}
            className="w-full sm:w-auto px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs min-touch-target flex items-center justify-center"
          >
            <DollarSign className="w-3.5 h-3.5 mr-1" /> Record Payment
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto space-x-2">
        {[
          { id: 'projects', label: `Projects (${projects.length})`, icon: FolderKanban },
          { id: 'tasks', label: `Tasks (${tasks.length})`, icon: CheckSquare },
          { id: 'timeline', label: `Timeline (${interactions.length})`, icon: Clock },
          { id: 'notes', label: 'Preferences & Notes', icon: Edit2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors min-touch-target ${
                isActive
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5 mr-1.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {/* 1. Projects Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Client Projects</h2>
            <button
              type="button"
              onClick={() => setIsAddProjectOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center min-touch-target"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Project
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              No active projects yet. Create a project to track milestones and deliverables.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => navigate(`/projects/${proj.id}`)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 cursor-pointer transition-all shadow-xs group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 transition-colors">
                        {proj.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Deadline: {formatDate(proj.deadline)}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                      {proj.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(proj.agreedAmount)}
                    </span>
                    <span className="text-brand-600 flex items-center font-medium">
                      Manage <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Tasks & Deliverables</h2>
            <button
              type="button"
              onClick={() => setIsAddTaskOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center min-touch-target"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              No tasks logged for this client yet.
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => completeTask(task.id)}
                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <div>
                        <div className={`text-sm font-medium ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {task.title}
                        </div>
                        <div className="text-xs text-slate-400">
                          {task.category} {task.dueAt && `• Due ${formatDate(task.dueAt)}`}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                      {task.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Interaction Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Interaction History</h2>
            <button
              type="button"
              onClick={() => setIsLogInteractionOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 text-xs font-semibold flex items-center min-touch-target"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Log New
            </button>
          </div>

          {interactions.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              No communication history logged yet.
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 border-l border-slate-200 dark:border-slate-800 ml-2">
              {interactions.map((inter) => (
                <div key={inter.id} className="relative">
                  <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-white dark:ring-slate-950" />
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">
                        {inter.type}: {inter.outcome}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {formatRelativeDate(inter.occurredAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {inter.summary}
                    </p>
                    {inter.durationMinutes && (
                      <span className="inline-block mt-2 text-[10px] text-slate-400 font-medium">
                        ⏱ Duration: {inter.durationMinutes} mins
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Notes & Preferences Tab */}
      {activeTab === 'notes' && (
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Client Preferences & Notes</h2>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs text-brand-600 font-semibold hover:underline"
            >
              Edit Notes
            </button>
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {client.notes || 'No specific preferences or notes added yet.'}
          </div>
        </div>
      )}

      {/* Edit Client Profile Modal */}
      <ClientFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={client}
      />

      {/* Log Interaction Modal */}
      <InteractionFormModal
        isOpen={isLogInteractionOpen}
        onClose={() => setIsLogInteractionOpen(false)}
        defaultClientId={client.id}
      />

      {/* Add Task Modal */}
      <TaskFormModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        defaultClientId={client.id}
      />

      {/* Add Project Modal */}
      <ProjectFormModal
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        defaultClientId={client.id}
      />

      {/* Record Payment Modal */}
      <PaymentFormModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        defaultClientId={client.id}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isArchiveConfirmOpen}
        onClose={() => setIsArchiveConfirmOpen(false)}
        onConfirm={async () => {
          await archiveClient();
        }}
        title="Archive Client?"
        message={`Archiving "${client.name}" moves their profile to the archive view. Their projects, interaction history, and payments remain completely safe.`}
        confirmText="Archive Client"
        isDestructive={false}
      />
    </div>
  );
}
