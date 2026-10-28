import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { isToday, isPast, parseISO, startOfDay, endOfDay, startOfMonth } from 'date-fns';

export function useDashboard() {
  const data = useLiveQuery(
    async () => {
      const [
        clients,
        leads,
        tasks,
        projects,
        payments,
        interactions,
        reminders,
        invoices,
        subscriptions,
        contentItems,
      ] = await Promise.all([
        db.clients.toArray(),
        db.leads.toArray(),
        db.tasks.toArray(),
        db.projects.toArray(),
        db.payments.toArray(),
        db.interactions.orderBy('occurredAt').reverse().limit(10).toArray(),
        db.reminders.where('status').equals('scheduled').toArray(),
        db.invoices ? db.invoices.toArray() : [],
        db.subscriptions ? db.subscriptions.toArray() : [],
        db.content_items ? db.content_items.toArray() : [],
      ]);

      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const monthStart = startOfMonth(now);
      const todayISO = now.toISOString().slice(0, 10);
      const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

      // Clients
      const activeClients = clients.filter((c) => c.status === 'active');

      // MRR & Subscriptions
      const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');
      const mrr = activeSubscriptions.reduce((sum, s) => {
        const amt = Number(s.monthlyAmount) || 0;
        if (s.billingFrequency === 'quarterly') return sum + amt / 3;
        if (s.billingFrequency === 'yearly') return sum + amt / 12;
        return sum + amt;
      }, 0);

      const renewalsDueSoon = subscriptions.filter(
        (s) =>
          s.status === 'active' &&
          ((s.nextInvoiceDate && s.nextInvoiceDate >= todayISO && s.nextInvoiceDate <= sevenDaysLater) ||
            (s.renewalDate && s.renewalDate >= todayISO && s.renewalDate <= sevenDaysLater))
      );

      // Content Deliverables
      const contentDeliverablesToday = contentItems.filter(
        (c) => c.scheduledDate && c.scheduledDate.slice(0, 10) === todayISO && c.stage !== 'published'
      );
      const contentDeliverablesThisWeek = contentItems.filter(
        (c) =>
          c.scheduledDate &&
          c.scheduledDate.slice(0, 10) >= todayISO &&
          c.scheduledDate.slice(0, 10) <= sevenDaysLater &&
          c.stage !== 'published'
      );

      // Invoices
      const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
      const overdueInvoicesAmount = overdueInvoices.reduce(
        (sum, i) => sum + Math.max(0, (Number(i.total) || 0) - (Number(i.paidAmount) || 0)),
        0
      );

      const outstandingReceivables = invoices
        .filter((i) => i.status !== 'void' && i.status !== 'paid' && i.status !== 'draft')
        .reduce((sum, i) => sum + Math.max(0, (Number(i.total) || 0) - (Number(i.paidAmount) || 0)), 0);

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
      const outstandingPayments = outstandingReceivables > 0 ? outstandingReceivables : Math.max(0, totalAgreed - netCollected);

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
          mrr,
          monthCollected,
          outstandingPayments,
          overdueInvoicesCount: overdueInvoices.length,
          overdueInvoicesAmount,
          renewalsDueSoonCount: renewalsDueSoon.length,
          contentTodayCount: contentDeliverablesToday.length,
          contentWeekCount: contentDeliverablesThisWeek.length,
          followUpsToday: todayFollowUps.length,
          overdueFollowUps: overdueFollowUps.length,
          pendingTasksToday: pendingTasksToday.length,
          completedTasksToday: completedTasksToday.length,
          overdueTasksCount: overdueTasks.length,
          pendingDeliverables: pendingDeliverables.length,
          totalAgreed,
          netCollected,
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
          renewalsDueSoon,
          contentDeliverablesToday,
          contentDeliverablesThisWeek,
          overdueInvoices,
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
