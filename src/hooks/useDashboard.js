import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { isToday, isPast, parseISO, startOfDay, endOfDay, startOfMonth } from 'date-fns';

export function useDashboard() {
  const data = useLiveQuery(
    async () => {
      const [clients, leads, tasks, projects, payments, interactions, reminders] = await Promise.all([
        db.clients.toArray(),
        db.leads.toArray(),
        db.tasks.toArray(),
        db.projects.toArray(),
        db.payments.toArray(),
        db.interactions.orderBy('occurredAt').reverse().limit(10).toArray(),
        db.reminders.where('status').equals('scheduled').toArray(),
      ]);

      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const monthStart = startOfMonth(now);

      // Clients
      const activeClients = clients.filter((c) => c.status === 'active');

      // Leads
      const openLeads = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost');
      const wonLeads = leads.filter((l) => l.stage === 'won');
      const lostLeads = leads.filter((l) => l.stage === 'lost');

      // Follow-ups
      const leadsWithFollowUp = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost' && l.nextFollowUpAt);
      const todayFollowUps = leadsWithFollowUp.filter((l) => {
        const d = parseISO(l.nextFollowUpAt);
        return isToday(d);
      });
      const overdueFollowUps = leadsWithFollowUp.filter((l) => {
        const d = parseISO(l.nextFollowUpAt);
        return d < todayStart;
      });

      // Tasks
      const pendingTasksToday = tasks.filter((t) => {
        if (t.status === 'completed' || t.status === 'cancelled') return false;
        if (!t.dueAt) return false;
        return isToday(parseISO(t.dueAt));
      });

      const completedTasksToday = tasks.filter((t) => {
        if (t.status !== 'completed' || !t.completedAt) return false;
        return isToday(parseISO(t.completedAt));
      });

      const overdueTasks = tasks.filter((t) => {
        if (t.status === 'completed' || t.status === 'cancelled') return false;
        if (!t.dueAt) return false;
        return parseISO(t.dueAt) < todayStart;
      });

      // Projects
      const activeProjects = projects.filter((p) => p.status === 'active');
      const upcomingDeadlines = activeProjects
        .filter((p) => p.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);

      const pendingDeliverables = tasks.filter((t) => t.projectId && t.status !== 'completed' && t.status !== 'cancelled');

      // Payments & Balances
      const totalAgreed = projects.reduce((sum, p) => sum + (Number(p.agreedAmount) || 0), 0);

      let totalCollected = 0;
      let monthCollected = 0;
      let totalRefunds = 0;
      let totalAdjustments = 0;

      for (const p of payments) {
        if (p.status !== 'recorded') continue;
        const amt = Number(p.amount) || 0;
        if (p.type === 'payment') {
          totalCollected += amt;
          if (p.paidAt && parseISO(p.paidAt) >= monthStart) {
            monthCollected += amt;
          }
        } else if (p.type === 'refund') {
          totalRefunds += amt;
          if (p.paidAt && parseISO(p.paidAt) >= monthStart) {
            monthCollected -= amt;
          }
        } else if (p.type === 'adjustment') {
          totalAdjustments += amt;
          if (p.paidAt && parseISO(p.paidAt) >= monthStart) {
            monthCollected += amt;
          }
        }
      }

      const netCollected = totalCollected - totalRefunds + totalAdjustments;
      const outstandingPayments = Math.max(0, totalAgreed - netCollected);

      // Conversion Rate calculation
      const totalDecidedLeads = wonLeads.length + lostLeads.length;
      const conversionRateDecided = totalDecidedLeads > 0 ? Math.round((wonLeads.length / totalDecidedLeads) * 100) : 0;
      const conversionRateTotal = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;

      // Check if new installation (no records yet)
      const isNewInstallation = clients.length === 0 && leads.length === 0 && tasks.length === 0 && projects.length === 0;

      return {
        isNewInstallation,
        counts: {
          activeClients: activeClients.length,
          openLeads: openLeads.length,
          followUpsToday: todayFollowUps.length,
          overdueFollowUps: overdueFollowUps.length,
          pendingTasksToday: pendingTasksToday.length,
          completedTasksToday: completedTasksToday.length,
          overdueTasksCount: overdueTasks.length,
          pendingDeliverables: pendingDeliverables.length,
          totalAgreed,
          netCollected,
          monthCollected,
          outstandingPayments,
          conversionRateDecided,
          conversionRateTotal,
          wonLeadsCount: wonLeads.length,
          totalLeadsCount: leads.length,
        },
        lists: {
          todayFollowUps,
          overdueFollowUps,
          pendingTasksToday,
          overdueTasks,
          completedTasksToday,
          upcomingDeadlines,
          recentInteractions: interactions,
        },
      };
    },
    [],
    null
  );

  return {
    dashboard: data,
    isLoading: data === null,
  };
}
