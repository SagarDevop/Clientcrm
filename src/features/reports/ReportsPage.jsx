import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database.js';
import { formatCurrency, LEAD_STAGES } from '../../utils/formatters.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import {
  Trophy,
  CheckCircle2,
  DollarSign,
  PhoneCall,
} from 'lucide-react';
import { startOfWeek, parseISO, isAfter } from 'date-fns';

export function ReportsPage() {
  const reports = useLiveQuery(
    async () => {
      const [clients, leads, projects, tasks, payments, interactions] = await Promise.all([
        db.clients.toArray(),
        db.leads.toArray(),
        db.projects.toArray(),
        db.tasks.toArray(),
        db.payments.toArray(),
        db.interactions.toArray(),
      ]);

      const now = new Date();
      const weekStart = startOfWeek(now);

      // Interactions
      const interactionsThisWeek = interactions.filter((i) => isAfter(parseISO(i.occurredAt), weekStart));

      // Leads by stage
      const stageDistribution = {};
      LEAD_STAGES.forEach((s) => (stageDistribution[s.value] = 0));
      leads.forEach((l) => {
        stageDistribution[l.stage] = (stageDistribution[l.stage] || 0) + 1;
      });

      // Leads by source
      const sourceDistribution = {};
      leads.forEach((l) => {
        const src = (l.source || 'Direct').trim();
        sourceDistribution[src] = (sourceDistribution[src] || 0) + 1;
      });

      // Conversion metrics
      const wonLeads = leads.filter((l) => l.stage === 'won');
      const lostLeads = leads.filter((l) => l.stage === 'lost');
      const decidedCount = wonLeads.length + lostLeads.length;
      const winRate = decidedCount > 0 ? Math.round((wonLeads.length / decidedCount) * 100) : 0;
      const pipelineConversion = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;

      // Demos sent
      const demosSent = leads.filter((l) => l.demoStatus && l.demoStatus !== 'not_sent').length;

      // Tasks
      const completedTasks = tasks.filter((t) => t.status === 'completed');
      const completedTasksThisWeek = completedTasks.filter(
        (t) => t.completedAt && isAfter(parseISO(t.completedAt), weekStart)
      );

      // Financials
      let totalContractValue = projects.reduce((sum, p) => sum + (Number(p.agreedAmount) || 0), 0);
      let totalCollected = 0;
      let totalRefunds = 0;

      payments.forEach((p) => {
        if (p.status !== 'recorded') return;
        const amt = Number(p.amount) || 0;
        if (p.type === 'payment') totalCollected += amt;
        else if (p.type === 'refund') totalRefunds += amt;
        else if (p.type === 'adjustment') totalCollected += amt;
      });

      const netCollected = totalCollected - totalRefunds;
      const outstanding = Math.max(0, totalContractValue - netCollected);

      return {
        counts: {
          totalClients: clients.length,
          totalLeads: leads.length,
          wonLeads: wonLeads.length,
          lostLeads: lostLeads.length,
          decidedCount,
          winRate,
          pipelineConversion,
          demosSent,
          interactionsCount: interactions.length,
          interactionsThisWeek: interactionsThisWeek.length,
          tasksCompletedCount: completedTasks.length,
          tasksCompletedThisWeek: completedTasksThisWeek.length,
          totalContractValue,
          netCollected,
          outstanding,
        },
        stageDistribution,
        sourceDistribution,
      };
    },
    [],
    null
  );

  if (!reports) {
    return <LoadingSpinner text="Compiling business intelligence report..." size="lg" className="min-h-[50vh]" />;
  }

  const { counts, stageDistribution, sourceDistribution } = reports;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Performance & Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Derived from live local IndexedDB records • Zero external telemetry
        </p>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Win Rate */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Decided Win Rate</span>
            <Trophy className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{counts.winRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {counts.wonLeads} won out of {counts.decidedCount} closed deals
          </div>
        </div>

        {/* Total Collected Revenue */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Net Collected Revenue</span>
            <DollarSign className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(counts.netCollected)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Outstanding: {formatCurrency(counts.outstanding)}
          </div>
        </div>

        {/* Weekly Interactions */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Touchpoints This Week</span>
            <PhoneCall className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {counts.interactionsThisWeek}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {counts.interactionsCount} all-time interactions
          </div>
        </div>

        {/* Tasks Completed */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Tasks Finished This Week</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {counts.tasksCompletedThisWeek}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {counts.tasksCompletedCount} total milestones delivered
          </div>
        </div>
      </div>

      {/* Two Column Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pipeline Stage Distribution Bar Visualization */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Leads Distribution by Stage
            </h2>
            <span className="text-xs text-slate-400">{counts.totalLeads} total prospects</span>
          </div>

          <div className="space-y-2.5">
            {LEAD_STAGES.map((stg) => {
              const count = stageDistribution[stg.value] || 0;
              const pct = counts.totalLeads > 0 ? Math.round((count / counts.totalLeads) * 100) : 0;

              return (
                <div key={stg.value} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{stg.label}</span>
                    <span className="text-slate-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Source Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Lead Acquisition Sources
            </h2>
            <span className="text-xs text-slate-400">Channel breakdown</span>
          </div>

          {Object.keys(sourceDistribution).length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No lead sources recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(sourceDistribution).map(([src, count]) => {
                const pct = counts.totalLeads > 0 ? Math.round((count / counts.totalLeads) * 100) : 0;

                return (
                  <div key={src} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{src}</span>
                      <span className="text-slate-400">
                        {count} lead{count === 1 ? '' : 's'} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cohort & Conversion Explanations Note */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
        <div className="font-semibold text-slate-800 dark:text-slate-200">
          Conversion Metrics Explanation
        </div>
        <p>
          • <b>Decided Win Rate ({counts.winRate}%):</b> Calculated as Won Deals ({counts.wonLeads}) ÷ Closed Deals ({counts.decidedCount} total won + lost). Leads still in negotiation or contacted are excluded from this denominator.
        </p>
        <p>
          • <b>All-Time Pipeline Conversion ({counts.pipelineConversion}%):</b> Calculated as Won Deals ({counts.wonLeads}) ÷ All Created Prospects ({counts.totalLeads}).
        </p>
      </div>
    </div>
  );
}
