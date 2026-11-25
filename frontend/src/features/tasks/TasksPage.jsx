import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks.js';
import { useClients } from '../../hooks/useClients.js';
import { formatDate, formatRelativeDate, TASK_PRIORITIES } from '../../utils/formatters.js';
import { TaskFormModal } from '../../components/forms/TaskFormModal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import {
  CheckSquare,
  Plus,
  Clock,
  Repeat,
  CheckCircle2,
  Trash2,
  Edit2,
} from 'lucide-react';

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'today';

  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const { tasks, isLoading, completeTask, reopenTask, deleteTask } = useTasks({
    filter: activeFilter,
    priority: priorityFilter || undefined,
  });

  const { clients } = useClients();

  const handleFilterChange = (f) => {
    setActiveFilter(f);
    setSearchParams(f === 'today' ? {} : { filter: f });
  };

  const getClientName = (clientId) => {
    if (!clientId) return null;
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : null;
  };

  return (
    <div className="space-y-4">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Daily Tasks & Deliverables
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {tasks.length} {activeFilter} task{tasks.length === 1 ? '' : 's'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingTask(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs sm:text-sm transition-all shadow-xs min-touch-target"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
          {[
            { id: 'today', label: "Today's Tasks" },
            { id: 'overdue', label: 'Overdue' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'completed', label: 'Completed' },
            { id: '', label: 'All Tasks' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleFilterChange(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-touch-target ${
                activeFilter === f.id
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
        >
          <option value="">All Priorities</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label} Priority
            </option>
          ))}
        </select>
      </div>

      {/* Task List */}
      {isLoading ? (
        <LoadingSpinner text="Loading tasks..." />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={
            activeFilter === 'overdue'
              ? 'No overdue tasks!'
              : activeFilter === 'today'
              ? 'No tasks due today'
              : 'No tasks found'
          }
          description="Create and schedule tasks to stay on top of daily deliverables."
          actionLabel="Add Task"
          onAction={() => {
            setEditingTask(null);
            setIsAddModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => {
            const isDone = task.status === 'completed';
            const clientName = getClientName(task.clientId);

            return (
              <div
                key={task.id}
                className={`p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-xs flex items-center justify-between gap-3 ${
                  isDone
                    ? 'border-slate-100 dark:border-slate-800 opacity-75'
                    : 'border-slate-200 dark:border-slate-800 hover:border-brand-500'
                }`}
              >
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (isDone) reopenTask(task.id);
                      else completeTask(task.id);
                    }}
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors min-touch-target ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 dark:border-slate-700 hover:border-brand-500'
                    }`}
                    aria-label={isDone ? 'Mark as incomplete' : 'Mark task completed'}
                  >
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-sm font-semibold truncate ${
                          isDone
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.recurrence && task.recurrence !== 'none' && (
                        <span
                          className="inline-flex items-center text-[10px] text-brand-600 dark:text-brand-400 font-medium bg-brand-50 dark:bg-brand-950/40 px-1.5 py-0.5 rounded"
                          title={`Repeats ${task.recurrence}`}
                        >
                          <Repeat className="w-2.5 h-2.5 mr-0.5" /> {task.recurrence}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                      <span>{task.category || 'General'}</span>
                      {clientName && <span className="text-slate-600 dark:text-slate-300">👤 {clientName}</span>}
                      {task.dueAt && (
                        <span className="flex items-center text-slate-500 dark:text-slate-400">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatRelativeDate(task.dueAt)}
                        </span>
                      )}
                      {task.completedAt && (
                        <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                          Completed {formatRelativeDate(task.completedAt)}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize hidden sm:inline-block ${
                      task.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                        : task.priority === 'high'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {task.priority}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingTask(task);
                      setIsAddModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 min-touch-target"
                    aria-label="Edit task"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 min-touch-target"
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      <TaskFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTask(null);
        }}
        initialData={editingTask}
      />
    </div>
  );
}
