import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../../hooks/useProjects.js';
import { useClients } from '../../hooks/useClients.js';
import { useTasks } from '../../hooks/useTasks.js';
import { usePayments, useFinancialSummary } from '../../hooks/usePayments.js';
import { formatCurrency, formatDate, PROJECT_STATUSES } from '../../utils/formatters.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { ProjectFormModal } from '../../components/forms/ProjectFormModal.jsx';
import { TaskFormModal } from '../../components/forms/TaskFormModal.jsx';
import { PaymentFormModal } from '../../components/forms/PaymentFormModal.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import {
  ArrowLeft,
  Edit2,
  CheckCircle2,
  Plus,
  DollarSign,
  User,
  Trash2,
} from 'lucide-react';

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { project, progress, isLoading, completeProject } = useProject(id);
  const { clients } = useClients();
  const { tasks, completeTask, deleteTask } = useTasks({ projectId: id });
  const financialSummary = useFinancialSummary({ projectId: id });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  if (isLoading) {
    return <LoadingSpinner text="Loading project details..." size="lg" className="min-h-[50vh]" />;
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Project Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">This project does not exist.</p>
        <button
          onClick={() => navigate('/projects')}
          className="mt-4 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const client = clients.find((c) => c.id === project.clientId);

  return (
    <div className="space-y-6">
      {/* Top Back & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 min-touch-target"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Projects
        </button>

        <div className="flex items-center space-x-2">
          {project.status !== 'completed' && (
            <button
              type="button"
              onClick={() => completeProject()}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold min-touch-target flex items-center shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark Completed
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium min-touch-target flex items-center"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
          </button>
        </div>
      </div>

      {/* Hero Project Details Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{project.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                {project.status.replace(/_/g, ' ')}
              </span>
            </div>

            {client && (
              <p
                onClick={() => navigate(`/clients/${client.id}`)}
                className="text-sm font-semibold text-brand-600 dark:text-brand-400 mt-1 cursor-pointer hover:underline flex items-center"
              >
                <User className="w-3.5 h-3.5 mr-1" /> Client: {client.name} {client.businessName ? `(${client.businessName})` : ''}
              </p>
            )}

            {project.description && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed max-w-2xl">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:items-end text-xs space-y-1 text-slate-500 dark:text-slate-400">
            <div>
              Contract Amount: <b className="text-sm text-slate-900 dark:text-slate-100">{formatCurrency(project.agreedAmount)}</b>
            </div>
            <div>Start Date: {formatDate(project.startDate)}</div>
            <div>Deadline: <b className="text-slate-800 dark:text-slate-200">{formatDate(project.deadline)}</b></div>
          </div>
        </div>

        {/* Progress Bar & Explanation */}
        {progress && (
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Deliverables Progress ({progress.percentage}%)
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {progress.explanation}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-brand-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Financials for this project */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div>
          <span className="text-[11px] font-medium text-slate-400">Contract Value</span>
          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(financialSummary.agreedAmount)}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-400">Recorded Payments</span>
          <div className="text-base sm:text-lg font-bold text-emerald-600">
            {formatCurrency(financialSummary.netReceived)}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-400">Outstanding</span>
          <div className="text-base sm:text-lg font-bold text-amber-600">
            {formatCurrency(financialSummary.outstanding)}
          </div>
        </div>
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full sm:w-auto px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs min-touch-target flex items-center justify-center"
          >
            <DollarSign className="w-3.5 h-3.5 mr-1" /> Log Payment
          </button>
        </div>
      </div>

      {/* Project Deliverable Checklist / Tasks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Deliverables & Milestone Checklist ({tasks.length})
          </h2>
          <button
            type="button"
            onClick={() => setIsAddTaskOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 text-xs font-semibold flex items-center min-touch-target"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Deliverable
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            No deliverable tasks added to this project yet.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const isDone = task.status === 'completed';
              return (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-xs flex items-center justify-between gap-3 ${
                    isDone
                      ? 'border-slate-100 dark:border-slate-800 opacity-80'
                      : 'border-slate-200 dark:border-slate-800 hover:border-brand-500'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => completeTask(task.id)}
                      className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer min-touch-target"
                    />
                    <div className="min-w-0">
                      <div className={`text-sm font-medium truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {task.title}
                      </div>
                      <div className="text-xs text-slate-400">
                        {task.category} {task.dueAt && `• Due ${formatDate(task.dueAt)}`}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg min-touch-target"
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <ProjectFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={project}
      />

      <TaskFormModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        defaultClientId={project.clientId}
        defaultProjectId={project.id}
      />

      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        defaultClientId={project.clientId}
        defaultProjectId={project.id}
      />
    </div>
  );
}
