import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../../hooks/useClients.js';
import { useExpenses } from '../../hooks/useExpenses.js';
import { ClientFormModal } from '../../components/forms/ClientFormModal.jsx';
import { AddExpenseModal } from '../../components/forms/AddExpenseModal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { WhatsAppModal } from '../../components/common/WhatsAppModal.jsx';
import { sendClientCompletionEmails, sendWebDevDeliveryEmails } from '../../utils/email.js';
import { motion } from 'framer-motion';
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [completionSendingId, setCompletionSendingId] = useState(null);
  const [completionFeedback, setCompletionFeedback] = useState(null);
  const [selectedWhatsAppClient, setSelectedWhatsAppClient] = useState(null);

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

  // Net Profit & Agency Margin
  const netProfit = totalPaymentsReceived - totalExpenses;
  const profitMargin = totalPaymentsReceived > 0 ? Math.round((netProfit / totalPaymentsReceived) * 100) : 0;

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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
              Agency Growth Suite
            </span>
            <span className="text-xs text-stone-400">• MRR & Expense Analytics</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100 mt-1">
            Company Revenue, Costs & Profit Center
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Track Monthly Recurring Revenue (MRR), company tool expenses, server costs, and net profit margins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setIsAddExpenseOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/60 font-bold text-xs tracking-wide shadow-xs transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>+ Add Expense</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-emerald-600/25 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Client</span>
          </motion.button>
        </div>
      </motion.div>

      {completionFeedback && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm ${
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

      {/* 5 Growth & Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Monthly Recurring Revenue (MRR) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              Monthly MRR
            </span>
            <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
            ₹{monthlyRecurringRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-400 mt-2">Active Retainers / Mo</div>
        </motion.div>

        {/* 2. Total Cleared Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Cleared Inflow
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            ₹{totalPaymentsReceived.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-400 mt-2">Tokens & Payments Received</div>
        </motion.div>

        {/* 3. Company Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          onClick={() => setIsAddExpenseOpen(true)}
          className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:border-rose-400 cursor-pointer shadow-sm relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            ₹{totalExpenses.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-400 mt-2">
            ₹{thisMonthExpenses.toLocaleString()} this month
          </div>
        </motion.div>

        {/* 4. Net Profit */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Net Agency Profit
            </span>
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            ₹{netProfit.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-400 mt-2">Margin: {profitMargin}%</div>
        </motion.div>

        {/* 5. Pending Balance Receivables */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          onClick={() => navigate('/clients')}
          className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:border-amber-400 cursor-pointer shadow-sm relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Pending Receivables
            </span>
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
            ₹{totalRemainingDue.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-400 mt-2">To collect on delivery</div>
        </motion.div>
      </div>

      {/* SaaS Analytics Chart Bars Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
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
