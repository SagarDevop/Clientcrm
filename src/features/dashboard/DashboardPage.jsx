import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDashboard } from '../../hooks/useDashboard.js';
import { formatCurrency, formatDate, formatRelativeDate, getLeadStageBadgeColor, getLeadStageLabel } from '../../utils/formatters.js';
import {
  Users,
  UserPlus,
  Calendar,
  AlertTriangle,
  CheckSquare,
  DollarSign,
  ArrowRight,
  PhoneCall,
  FolderKanban,
  Sparkles,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';

export function DashboardPage() {
  const { dashboard, isLoading } = useDashboard();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingSpinner text="Loading your dashboard..." size="lg" className="min-h-[50vh]" />;
  }

  const { counts, lists, isNewInstallation } = dashboard;

  if (isNewInstallation) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="max-w-xl">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 mb-3">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-brand-600" /> Private & Local-First CRM
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
              Welcome to your Personal CRM
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              A private, mobile-first workspace for solo operators to track clients, pipeline deals, project deliverables, and incoming payments locally.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/leads')}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors min-touch-target shadow-xs"
              >
                + Add Your First Lead
              </button>
              <button
                type="button"
                onClick={() => navigate('/clients')}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-200 font-medium text-sm transition-colors min-touch-target"
              >
                + Add Existing Client
              </button>
            </div>
          </div>
        </div>

        <EmptyState
          icon={Users}
          title="No business activity recorded yet"
          description="All your clients, sales stages, tasks, and payments will show up live right here with zero cloud latency."
          actionLabel="Explore Services"
          onAction={() => navigate('/services')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Greeting & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Business Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Live local data • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-touch-target flex items-center"
          >
            <CheckSquare className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Today's Tasks ({counts.pendingTasksToday})
          </button>
          <button
            type="button"
            onClick={() => navigate('/leads')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors min-touch-target flex items-center shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Pipeline ({counts.openLeads})
          </button>
        </div>
      </div>

      {/* Overdue Alert Banner if any overdue items */}
      {(counts.overdueFollowUps > 0 || counts.overdueTasksCount > 0) && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Action Required: Overdue Items
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                {counts.overdueFollowUps > 0 && `${counts.overdueFollowUps} overdue lead follow-up${counts.overdueFollowUps > 1 ? 's' : ''}`}
                {counts.overdueFollowUps > 0 && counts.overdueTasksCount > 0 && ' and '}
                {counts.overdueTasksCount > 0 && `${counts.overdueTasksCount} overdue task${counts.overdueTasksCount > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {counts.overdueFollowUps > 0 && (
              <button
                type="button"
                onClick={() => navigate('/leads?filter=overdue')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              >
                Review Follow-ups
              </button>
            )}
            {counts.overdueTasksCount > 0 && (
              <button
                type="button"
                onClick={() => navigate('/tasks?filter=overdue')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-100/50 transition-colors"
              >
                Review Tasks
              </button>
            )}
          </div>
        </div>
      )}

      {/* Key Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Clients */}
        <div
          onClick={() => navigate('/clients')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 cursor-pointer transition-colors shadow-xs group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Clients</span>
            <div className="p-2 rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{counts.activeClients}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center">
            View roster <ArrowRight className="w-3 h-3 ml-1" />
          </div>
        </div>

        {/* Open Leads */}
        <div
          onClick={() => navigate('/leads')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 cursor-pointer transition-colors shadow-xs group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Leads</span>
            <div className="p-2 rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{counts.openLeads}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center">
            {counts.wonLeadsCount} won • {counts.conversionRateDecided}% win rate
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div
          onClick={() => navigate('/payments')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 cursor-pointer transition-colors shadow-xs group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Outstanding Balance</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(counts.outstandingPayments)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center">
            Collected: {formatCurrency(counts.netCollected)}
          </div>
        </div>

        {/* Today's Tasks */}
        <div
          onClick={() => navigate('/tasks?filter=today')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 cursor-pointer transition-colors shadow-xs group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Today's Tasks</span>
            <div className="p-2 rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{counts.pendingTasksToday}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center">
            {counts.completedTasksToday} completed today
          </div>
        </div>
      </div>

      {/* Main Two-Column Dashboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Today's Follow-ups & Deliverables */}
        <div className="space-y-6">
          {/* Today's Follow-ups */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Follow-ups Due Today ({lists.todayFollowUps.length})
                </h3>
              </div>
              <Link
                to="/leads"
                className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center"
              >
                All leads <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            {lists.todayFollowUps.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No follow-ups due today. You're completely up to date!
              </p>
            ) : (
              <div className="space-y-2">
                {lists.todayFollowUps.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-brand-500 bg-slate-50/60 dark:bg-slate-950/40 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{lead.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {lead.businessName ? `${lead.businessName} • ` : ''}{lead.phone}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getLeadStageBadgeColor(lead.stage)}`}>
                      {getLeadStageLabel(lead.stage)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Tasks */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Today's Pending Tasks ({lists.pendingTasksToday.length})
                </h3>
              </div>
              <Link
                to="/tasks"
                className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center"
              >
                Manage tasks <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            {lists.pendingTasksToday.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No tasks due today. Add daily deliverables to stay organized.
              </p>
            ) : (
              <div className="space-y-2">
                {lists.pendingTasksToday.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-brand-500 bg-slate-50/60 dark:bg-slate-950/40 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-2 h-2 rounded-full bg-brand-500" />
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</div>
                        <div className="text-xs text-slate-400">{task.category}</div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{task.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Deadlines, Financials & Recent Activity */}
        <div className="space-y-6">
          {/* Upcoming Project Deliverables */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FolderKanban className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Upcoming Project Deadlines
                </h3>
              </div>
              <Link
                to="/projects"
                className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center"
              >
                All projects <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            {lists.upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No active projects with upcoming deadlines.
              </p>
            ) : (
              <div className="space-y-2">
                {lists.upcomingDeadlines.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => navigate(`/projects/${proj.id}`)}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-brand-500 bg-slate-50/60 dark:bg-slate-950/40 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{proj.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Target: {formatDate(proj.deadline)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(proj.agreedAmount)}
                      </div>
                      <span className="text-[10px] text-brand-600 capitalize">{proj.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Interaction Activity Log */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <PhoneCall className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Recent Interactions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/leads')}
                className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                Pipeline history
              </button>
            </div>

            {lists.recentInteractions.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No interactions logged yet. Log calls or messages to track outreach.
              </p>
            ) : (
              <div className="space-y-2.5">
                {lists.recentInteractions.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-start space-x-3 text-xs"
                  >
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 capitalize font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">
                      {item.type}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.outcome}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">
                          {formatRelativeDate(item.occurredAt)}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {item.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
