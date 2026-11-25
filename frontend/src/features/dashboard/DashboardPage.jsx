import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../../hooks/useClients.js';
import { useExpenses } from '../../hooks/useExpenses.js';
import { usePayments } from '../../hooks/usePayments.js';
import { ClientFormModal } from '../../components/forms/ClientFormModal.jsx';
import { AddExpenseModal } from '../../components/forms/AddExpenseModal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { WhatsAppModal } from '../../components/common/WhatsAppModal.jsx';
import { sendClientCompletionEmails, sendWebDevDeliveryEmails } from '../../utils/email.js';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '../../components/common/AnimatedCounter.jsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  Users,
  DollarSign,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  Share2,
  Mail,
  CheckCircle2,
  TrendingUp,
  Activity,
  Zap,
  Receipt,
  Trash2,
  Target,
  Sparkles,
} from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();
  const { clients, isLoading } = useClients();
  const { expenses, addExpense, deleteExpense } = useExpenses();
  const { payments = [] } = usePayments();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [completionSendingId, setCompletionSendingId] = useState(null);
  const [completionFeedback, setCompletionFeedback] = useState(null);
  const [selectedWhatsAppClient, setSelectedWhatsAppClient] = useState(null);
  const [activeMetricTab, setActiveMetricTab] = useState('income'); // 'income' | 'mrr' | 'inflow' | 'expenses' | 'profit' | 'receivables'

  if (isLoading) {
    return <LoadingSpinner text="Starting SaaS Metrics Engine..." size="lg" className="min-h-[50vh]" />;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7); // '2026-11'
  const sevenDaysLaterStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const activeClients = clients.filter((c) => c.status === 'active');

  // Total Contracted Value
  const totalContracted = activeClients.reduce(
    (sum, c) =>
      sum +
      (Number(
        c.clientType === 'web_development' || c.category === 'web_dev'
          ? c.totalProjectCost || c.agreedAmount || 0
          : c.monthlyPlanAmount || 0
      ) || 0),
    0
  );

  // Cleared Collected Funds
  const totalPaymentsReceived = activeClients.reduce(
    (sum, c) =>
      sum +
      (Number(c.totalPaid) ||
        (Number(c.tokenPaid || c.advancePaid) || 0) + (Number(c.additionalPaid) || 0)),
    0
  );

  // Pending Receivables
  const totalRemainingDue = activeClients.reduce((sum, c) => {
    const cost = Number(
      c.clientType === 'web_development' || c.category === 'web_dev'
        ? c.totalProjectCost || c.agreedAmount || 0
        : c.monthlyPlanAmount || 0
    );
    const paid = Number(
      c.totalPaid ||
        (Number(c.tokenPaid || c.advancePaid) || 0) + (Number(c.additionalPaid) || 0)
    );
    return (
      sum +
      Math.max(
        0,
        Number(c.remainingAmount !== undefined ? c.remainingAmount : cost - paid)
      )
    );
  }, 0);

  // Monthly Recurring Revenue (MRR) - purely monthly recurring retainers
  const monthlyRecurringRevenue = activeClients.reduce((sum, c) => {
    const isWeb = c.clientType === 'web_development' || c.category === 'web_dev';
    return isWeb ? sum : sum + Number(c.monthlyPlanAmount || 0);
  }, 0);

  // Total Business Expenses & This Month Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const thisMonthExpenses = expenses
    .filter((e) => (e.date || '').startsWith(currentMonthStr))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Calculate all-time total historical income from payments table + all clients
  const totalAllTimeIncome = Math.max(
    totalPaymentsReceived,
    payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  );

  // Month-by-month Income aggregation from Payments ledger
  const monthlyIncomeMap = {};
  payments.forEach((p) => {
    const pDate = p.paidAt || p.createdAt || '';
    if (pDate.length >= 7) {
      const monthKey = pDate.slice(0, 7); // e.g. '2026-09', '2026-10', '2026-11'
      monthlyIncomeMap[monthKey] = (monthlyIncomeMap[monthKey] || 0) + Number(p.amount || 0);
    }
  });

  // Also include active client records start months if not in payments
  clients.forEach((c) => {
    const sDate = c.startDate || c.createdAt || '';
    const token = Number(c.tokenPaid || c.advancePaid || 0);
    if (sDate.length >= 7 && token > 0) {
      const monthKey = sDate.slice(0, 7);
      if (!monthlyIncomeMap[monthKey]) {
        monthlyIncomeMap[monthKey] = token;
      }
    }
  });

  // Ensure current month has at least totalPaymentsReceived
  monthlyIncomeMap[currentMonthStr] = Math.max(
    monthlyIncomeMap[currentMonthStr] || 0,
    totalPaymentsReceived
  );

  const sortedMonthKeys = Object.keys(monthlyIncomeMap).sort();
  const monthFormatter = (key) => {
    try {
      const [y, m] = key.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return key;
    }
  };

  const monthlyIncomeList = sortedMonthKeys.map((key) => ({
    key,
    label: monthFormatter(key),
    amount: monthlyIncomeMap[key],
    isCurrent: key === currentMonthStr,
  }));

  // Net Profit & Agency Margin (Calculated before interactive chart mapping)
  const netProfit = totalPaymentsReceived - totalExpenses;
  const profitMargin = totalPaymentsReceived > 0 ? Math.round((netProfit / totalPaymentsReceived) * 100) : 0;

  // Calculate month-by-month timeline metrics for interactive charts
  const monthlyExpensesMap = {};
  expenses.forEach((e) => {
    const eDate = e.date || e.createdAt || '';
    if (eDate.length >= 7) {
      const monthKey = eDate.slice(0, 7);
      monthlyExpensesMap[monthKey] = (monthlyExpensesMap[monthKey] || 0) + Number(e.amount || 0);
    }
  });

  const allMonthKeysSet = new Set([...Object.keys(monthlyIncomeMap), ...Object.keys(monthlyExpensesMap)]);
  if (!allMonthKeysSet.has(currentMonthStr)) allMonthKeysSet.add(currentMonthStr);
  const allSortedMonths = Array.from(allMonthKeysSet).sort();

  // If only 1 month exists, prepend last 2 months for aesthetic continuous graph curve
  let chartTimelineMonths = [...allSortedMonths];
  if (chartTimelineMonths.length === 1) {
    const cur = chartTimelineMonths[0]; // e.g. '2026-11'
    const [y, m] = cur.split('-').map(Number);
    const prev1 = new Date(y, m - 2, 1).toISOString().slice(0, 7);
    const prev2 = new Date(y, m - 3, 1).toISOString().slice(0, 7);
    chartTimelineMonths = [prev2, prev1, cur];
  }

  let runningCumulativeIncome = 0;
  const interactiveChartData = chartTimelineMonths.map((mKey) => {
    const inc = Number(monthlyIncomeMap[mKey] || 0);
    const exp = Number(monthlyExpensesMap[mKey] || 0);
    runningCumulativeIncome += inc;
    const prof = Math.max(0, inc - exp);
    const isCur = mKey === currentMonthStr;

    return {
      monthKey: mKey,
      name: monthFormatter(mKey),
      income: isCur && inc === 0 ? totalPaymentsReceived : inc,
      cumulative: runningCumulativeIncome || totalAllTimeIncome,
      mrr: monthlyRecurringRevenue,
      inflow: inc || (isCur ? totalPaymentsReceived : 0),
      expenses: exp,
      profit: isCur ? Math.max(0, netProfit) : prof,
      receivables: isCur ? totalRemainingDue : 0,
    };
  });

  // Dynamic configuration based on selected right-side metric
  const metricConfigs = {
    income: {
      title: 'Lifetime All-Time Income Trajectory',
      dataKey: 'cumulative',
      color: '#10b981',
      badge: 'Cumulative Inflow',
      unit: '₹',
      stat: totalAllTimeIncome,
      desc: 'All-time cumulative cash received across client retainers and web development projects.',
    },
    mrr: {
      title: 'Monthly Recurring Revenue (MRR) Run-Rate',
      dataKey: 'mrr',
      color: '#0ea5e9',
      badge: 'Predictable MRR',
      unit: '₹',
      stat: monthlyRecurringRevenue,
      desc: 'Guaranteed contracted monthly recurring subscription revenue renews automatically.',
    },
    inflow: {
      title: 'Cleared Inflow & Active Retainers Collected',
      dataKey: 'inflow',
      color: '#059669',
      badge: 'Cleared Funds',
      unit: '₹',
      stat: totalPaymentsReceived,
      desc: 'Total advances, tokens, and cleared payments collected in current cycle.',
    },
    expenses: {
      title: 'Operating Expenses & Software Tool Costs',
      dataKey: 'expenses',
      color: '#f43f5e',
      badge: 'Business Outflow',
      unit: '₹',
      stat: totalExpenses,
      desc: 'Company operating costs, cloud hosting, APIs, freelancer payouts and marketing.',
    },
    profit: {
      title: 'Net Agency Retained Profit Margin',
      dataKey: 'profit',
      color: '#6366f1',
      badge: `${profitMargin}% Margin`,
      unit: '₹',
      stat: netProfit,
      desc: 'True profit retained after subtracting software tools and company expenses.',
    },
    receivables: {
      title: 'Pending Milestone Receivables',
      dataKey: 'receivables',
      color: '#f59e0b',
      badge: 'Outstanding Due',
      unit: '₹',
      stat: totalRemainingDue,
      desc: 'Remaining balances due to be collected upon project delivery or milestone approvals.',
    },
  };

  const selectedMetric = metricConfigs[activeMetricTab] || metricConfigs.income;

  // Expiring Soon (Within 7 days or overdue)
  const expiringClients = activeClients.filter((c) => {
    const deadline = c.deliveryDate || c.completionDate;
    if (!deadline) return false;
    return deadline <= sevenDaysLaterStr;
  });

  // Recently Onboarded (last 5)
  const recentClients = [...clients]
    .sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate))
    .slice(0, 5);

  // Chart Data preparation: Revenue vs Expenses vs Net Profit
  const financialGrowthChart = [
    { name: 'Collected Inflow', amount: totalPaymentsReceived, fill: '#10b981' },
    { name: 'Company Expenses', amount: totalExpenses, fill: '#f43f5e' },
    { name: 'Net Growth Profit', amount: Math.max(0, netProfit), fill: '#6366f1' },
    { name: 'Monthly MRR', amount: monthlyRecurringRevenue, fill: '#0ea5e9' },
  ];

  const handleSendCompletion = async (e, client) => {
    e.stopPropagation();
    try {
      setCompletionSendingId(client.id);
      setCompletionFeedback(null);
      const isWeb = client.clientType === 'web_development' || client.category === 'web_dev';
      if (isWeb) {
        const res = await sendWebDevDeliveryEmails({ client, project: { name: client.projectName } });
        if (res.clientSent) {
          setCompletionFeedback({ type: 'success', text: `Delivery notice dispatched to ${client.email}` });
        } else {
          setCompletionFeedback({ type: 'error', text: res.errors?.join('; ') || 'Failed to dispatch email' });
        }
      } else {
        const res = await sendClientCompletionEmails({ client, forceRetry: true });
        if (res.clientSent) {
          setCompletionFeedback({ type: 'success', text: `Completion notice dispatched to ${client.email}` });
        } else {
          setCompletionFeedback({ type: 'error', text: res.errors?.join('; ') || 'Failed to dispatch email' });
        }
      }
    } catch (err) {
      setCompletionFeedback({ type: 'error', text: err.message });
    } finally {
      setCompletionSendingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2 sm:px-4 py-2">
      {/* SaaS Motion Topbar with Add Client + Add Expense */}
      {/* Compact SaaS Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 px-5 py-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
              Agency Suite
            </span>
            <span className="text-[11px] text-stone-400">MRR, Revenue & Profit Center</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mt-0.5">
            Overview & Revenue Studio
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setIsAddExpenseOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/60 font-semibold text-xs transition-all"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>+ Expense</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>+ Add Client</span>
          </motion.button>
        </div>
      </motion.div>

      {completionFeedback && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            completionFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
          }`}
        >
          <span>{completionFeedback.text}</span>
          <button
            type="button"
            onClick={() => setCompletionFeedback(null)}
            className="underline opacity-75 hover:opacity-100 ml-3"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* HERO SECTION: Interactive SaaS Analytics Studio */}
      {/* Left 65%: Fluid Area & Bar Chart tied to selected metric | Right 35%: Vertical Interactive Metric Deck */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
      >
        {/* Main Interactive Chart Canvas (8 Columns on desktop) */}
        <div className="lg:col-span-8 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div
            className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none transition-colors duration-500"
            style={{ backgroundColor: selectedMetric.color }}
          />

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors duration-300"
                    style={{
                      backgroundColor: `${selectedMetric.color}18`,
                      color: selectedMetric.color,
                      border: `1px solid ${selectedMetric.color}35`,
                    }}
                  >
                    {selectedMetric.badge}
                  </span>
                  <span className="text-[11px] text-stone-400">• Interactive Live Trajectory</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 mt-1">
                  {selectedMetric.title}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 max-w-xl">
                  {selectedMetric.desc}
                </p>
              </div>

              <div className="text-left sm:text-right flex-shrink-0">
                <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                  Selected Metric
                </span>
                <span
                  className="text-2xl sm:text-3xl font-black font-mono tracking-tight transition-colors duration-300"
                  style={{ color: selectedMetric.color }}
                >
                  <AnimatedCounter value={selectedMetric.stat} prefix="₹" />
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Recharts Multi-Month Curve */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={interactiveChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={selectedMetric.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={selectedMetric.color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.1)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#78716c', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#78716c', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString()}`, selectedMetric.badge]}
                  labelStyle={{ fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    borderRadius: '16px',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
                    padding: '10px 14px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={selectedMetric.dataKey}
                  stroke={selectedMetric.color}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#metricGradient)"
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: selectedMetric.color }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Month Ledger Strip below chart */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-stone-100 dark:border-stone-800 custom-scrollbar">
            {interactiveChartData.map((m) => (
              <div
                key={m.monthKey}
                className="px-3 py-1.5 rounded-xl bg-stone-50/80 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60 flex-shrink-0 flex items-center space-x-2 text-xs"
              >
                <span className="text-[10px] font-semibold text-stone-400">{m.name}:</span>
                <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                  ₹{Number(m[selectedMetric.dataKey] || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Vertical Interactive Metric Deck (4 Columns on desktop) */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-2.5">
          {/* Deck Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Click Card to Highlight Graph</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              LIVE DECK
            </span>
          </div>

          {/* Metric 1: All-Time Income */}
          <motion.div
            whileHover={{ scale: 1.015, x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveMetricTab('income')}
            className={`p-3.5 rounded-2xl cursor-pointer transition-all border relative flex items-center justify-between ${
              activeMetricTab === 'income'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-xl flex-shrink-0 ${
                  activeMetricTab === 'income'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                }`}
              >
                <DollarSign className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  All-Time Income
                </div>
                <div className="text-base font-black font-mono text-stone-900 dark:text-stone-100">
                  <AnimatedCounter value={totalAllTimeIncome} prefix="₹" />
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              Cumulative
            </span>
          </motion.div>

          {/* Metric 2: Monthly Recurring Revenue (MRR) */}
          <motion.div
            whileHover={{ scale: 1.015, x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveMetricTab('mrr')}
            className={`p-3.5 rounded-2xl cursor-pointer transition-all border relative flex items-center justify-between ${
              activeMetricTab === 'mrr'
                ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-500 shadow-sm ring-2 ring-sky-500/20'
                : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-xl flex-shrink-0 ${
                  activeMetricTab === 'mrr'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Monthly MRR
                </div>
                <div className="text-base font-black font-mono text-stone-900 dark:text-stone-100">
                  <AnimatedCounter value={monthlyRecurringRevenue} prefix="₹" />
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 font-mono">
              /Month
            </span>
          </motion.div>

          {/* Metric 3: Cleared Inflow */}
          <motion.div
            whileHover={{ scale: 1.015, x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveMetricTab('inflow')}
            className={`p-3.5 rounded-2xl cursor-pointer transition-all border relative flex items-center justify-between ${
              activeMetricTab === 'inflow'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-600 shadow-sm ring-2 ring-emerald-600/20'
                : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-xl flex-shrink-0 ${
                  activeMetricTab === 'inflow'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Cleared Inflow
                </div>
                <div className="text-base font-black font-mono text-stone-900 dark:text-stone-100">
                  <AnimatedCounter value={totalPaymentsReceived} prefix="₹" />
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 font-mono">
              Active
            </span>
          </motion.div>

          {/* Metric 4: Total Expenses */}
          <motion.div
            whileHover={{ scale: 1.015, x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveMetricTab('expenses')}
            className={`p-3.5 rounded-2xl cursor-pointer transition-all border relative flex items-center justify-between ${
              activeMetricTab === 'expenses'
                ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 shadow-sm ring-2 ring-rose-500/20'
                : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-xl flex-shrink-0 ${
                  activeMetricTab === 'expenses'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                }`}
              >
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Operating Expenses
                </div>
                <div className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                  <AnimatedCounter value={totalExpenses} prefix="₹" />
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-rose-600 font-mono">
              Outflow
            </span>
          </motion.div>

          {/* Metric 5: Net Profit */}
          <motion.div
            whileHover={{ scale: 1.015, x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveMetricTab('profit')}
            className={`p-3.5 rounded-2xl cursor-pointer transition-all border relative flex items-center justify-between ${
              activeMetricTab === 'profit'
                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-xl flex-shrink-0 ${
                  activeMetricTab === 'profit'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Net Agency Profit
                </div>
                <div className={`text-base font-black font-mono ${netProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
                  <AnimatedCounter value={netProfit} prefix="₹" />
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              {profitMargin}%
            </span>
          </motion.div>

          {/* Metric 6: Pending Receivables */}
          <motion.div
            whileHover={{ scale: 1.015, x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveMetricTab('receivables')}
            className={`p-3.5 rounded-2xl cursor-pointer transition-all border relative flex items-center justify-between ${
              activeMetricTab === 'receivables'
                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-xl flex-shrink-0 ${
                  activeMetricTab === 'receivables'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Pending Receivables
                </div>
                <div className="text-base font-black font-mono text-stone-900 dark:text-stone-100">
                  <AnimatedCounter value={totalRemainingDue} prefix="₹" />
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-600 font-mono">
              Due
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Secondary Bottom Section: Financial Growth Bar Chart + Expense Ledger */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Left: Financial Ledger Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Revenue, Company Costs & Growth Profit Comparison</span>
              </h2>
              <p className="text-xs text-stone-400">Live aggregate calculation of all client income versus business expenses</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
              INR (₹)
            </span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialGrowthChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString()}`, 'Amount']}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Recent Expenses Quick List */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-500" />
                <span>Recent Company Expenses</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddExpenseOpen(true)}
                className="text-xs font-bold text-rose-600 hover:underline"
              >
                + Add
              </button>
            </div>

            {expenses.length === 0 ? (
              <div className="text-center py-8 text-xs text-stone-400">
                No company expenses recorded yet. Click "+ Add Expense" to track software & team costs.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-48 overflow-y-auto custom-scrollbar">
                {expenses.slice(0, 5).map((exp) => (
                  <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-stone-900 dark:text-stone-100">{exp.description || exp.vendor}</div>
                      <div className="text-[10px] text-stone-400 capitalize">{exp.category} • {exp.date}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-rose-600">₹{Number(exp.amount).toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => deleteExpense(exp.id)}
                        className="text-stone-300 hover:text-rose-500 p-1"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300">
            <span className="font-bold text-stone-900 dark:text-stone-100 block mb-0.5">💡 Growth Formula:</span>
            Net Profit = Collected Revenue (₹{totalPaymentsReceived.toLocaleString()}) - Expenses (₹{totalExpenses.toLocaleString()}) = <strong className="text-emerald-600">₹{netProfit.toLocaleString()}</strong>
          </div>
        </div>
      </motion.div>

      {/* Plans Expiring Soon */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="p-6 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Milestones & Plans Expiring Soon ({expiringClients.length})
            </h2>
          </div>
          <span className="text-xs text-stone-400 font-medium">Due within 7 days</span>
        </div>

        {expiringClients.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">
            No active client plans or milestones expiring within the next 7 days. Everything is on schedule!
          </p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {expiringClients.map((client) => {
              const remaining = Number(client.remainingAmount || 0);
              const isOverdue = client.completionDate <= todayStr;

              return (
                <div
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/40 px-3 rounded-2xl transition-colors"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {client.name}
                      </span>
                      <span className="text-xs text-stone-500 font-medium">({client.businessName})</span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isOverdue ? 'Expiring Today' : `Due ${client.completionDate}`}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      Plan: ₹{Number(client.monthlyPlanAmount || client.totalProjectCost || 0).toLocaleString()} • Remaining Due:{' '}
                      <strong className="text-rose-600 font-mono font-bold">₹{remaining.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWhatsAppClient(client);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-xl transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp Smart Notice</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleSendCompletion(e, client)}
                      disabled={completionSendingId === client.id}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl disabled:opacity-50"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{completionSendingId === client.id ? 'Sending...' : 'Email Notice'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 p-1.5"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Recently Onboarded Accounts */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="p-6 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Recently Onboarded Accounts
            </h2>
            <p className="text-xs text-stone-400">Latest clients added to your agency database</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
          >
            All clients <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        {recentClients.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">No clients added yet. Click "Add Client" to onboard.</p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {recentClients.map((client) => {
              const isWeb = client.clientType === 'web_development' || client.category === 'web_dev';
              const cost = Number(isWeb ? (client.totalProjectCost || client.agreedAmount || 0) : (client.monthlyPlanAmount || 0));
              const remaining = Number(
                client.remainingAmount !== undefined
                  ? client.remainingAmount
                  : Math.max(0, cost - (Number(client.totalPaid) || 0))
              );
              const isPaid = remaining <= 0;

              return (
                <div
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="py-3.5 flex items-center justify-between text-xs cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/40 px-3 rounded-2xl transition-colors"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        {client.name}
                      </span>
                      <span className="text-stone-400 font-medium">({client.businessName})</span>
                      {isWeb && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                          Web Dev
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 mt-1">
                      {isWeb ? (
                        <>
                          {client.projectName || 'Project'} • Kickoff: {client.startDate || '—'} &rarr; Handover: {client.deliveryDate || client.completionDate || '—'}
                        </>
                      ) : (
                        <>
                          Started: {client.startDate || '—'} &rarr; Renewal: {client.completionDate || '—'}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100">
                      ₹{cost.toLocaleString()}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isPaid ? 'text-emerald-600' : 'text-rose-500'
                      }`}
                    >
                      {isPaid ? 'Paid in Full' : `Due: ₹${remaining.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Add Client Full PC Modal */}
      <ClientFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={(c) => navigate(`/clients/${c.id}`)}
      />

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onAdd={addExpense}
      />

      {/* 3-in-1 WhatsApp Smart Messenger Modal */}
      <WhatsAppModal
        isOpen={Boolean(selectedWhatsAppClient)}
        onClose={() => setSelectedWhatsAppClient(null)}
        client={selectedWhatsAppClient}
        defaultTemplate={
          selectedWhatsAppClient && Number(selectedWhatsAppClient.remainingAmount || 0) > 0
            ? 'balance'
            : 'renewal'
        }
      />
    </div>
  );
}
