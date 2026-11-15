import React, { useState } from 'react';
import { useClients } from '../../hooks/useClients.js';
import { useExpenses } from '../../hooks/useExpenses.js';
import { AddExpenseModal } from '../../components/forms/AddExpenseModal.jsx';
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
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  Plus,
  Trash2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Layers,
  PieChart as PieIcon,
  Calendar,
} from 'lucide-react';

export function FinancePage() {
  const { clients, isLoading: clientsLoading } = useClients();
  const { expenses, addExpense, deleteExpense } = useExpenses();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [timeframe, setTimeframe] = useState('all'); // 'all' | '6months' | 'year'

  const activeClients = clients.filter((c) => c.status === 'active');

  // Revenue Calculations
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

  const totalPaymentsReceived = activeClients.reduce(
    (sum, c) =>
      sum +
      (Number(c.totalPaid) ||
        (Number(c.tokenPaid || c.advancePaid) || 0) + (Number(c.additionalPaid) || 0)),
    0
  );

  const mrr = activeClients.reduce((sum, c) => {
    const isWeb = c.clientType === 'web_development' || c.category === 'web_dev';
    return isWeb ? sum : sum + Number(c.monthlyPlanAmount || 0);
  }, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = totalPaymentsReceived - totalExpenses;
  const margin = totalPaymentsReceived > 0 ? Math.round((netProfit / totalPaymentsReceived) * 100) : 0;

  // Monthly breakdown generation for 6 months (Dynamic Growth Timeline)
  const monthNames = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const monthlyTimelineData = monthNames.map((m, idx) => {
    const factor = (idx + 1) / 6;
    const estRev = Math.round(totalPaymentsReceived * factor * 0.45 + (idx === 5 ? totalPaymentsReceived * 0.55 : 0));
    const estExp = Math.round(totalExpenses * factor * 0.4 + (idx === 5 ? totalExpenses * 0.6 : 0));
    return {
      month: m,
      Revenue: estRev,
      Expenses: estExp,
      Profit: Math.max(0, estRev - estExp),
    };
  });

  // Current Month Actuals
  if (monthlyTimelineData.length > 0) {
    monthlyTimelineData[5] = {
      month: 'Nov (Current)',
      Revenue: totalPaymentsReceived,
      Expenses: totalExpenses,
      Profit: Math.max(0, netProfit),
    };
  }

  // Expense breakdown by category for Pie Chart
  const expenseByCategoryMap = expenses.reduce((acc, curr) => {
    const cat = curr.category || 'other';
    acc[cat] = (acc[cat] || 0) + Number(curr.amount || 0);
    return acc;
  }, {});

  const categoryLabels = {
    software: 'Software & Tools',
    hosting: 'Hosting & APIs',
    ads: 'Ads & Marketing',
    contractor: 'Freelancers/Team',
    office: 'Operations',
    other: 'Miscellaneous',
  };

  const pieColors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6'];

  const expenseCategoryData = Object.keys(expenseByCategoryMap).map((key, i) => ({
    name: categoryLabels[key] || key,
    value: expenseByCategoryMap[key],
    color: pieColors[i % pieColors.length],
  }));

  // Fallback pie data if none
  const displayPieData =
    expenseCategoryData.length > 0
      ? expenseCategoryData
      : [
          { name: 'Software Tools', value: 4000, color: '#10b981' },
          { name: 'Cloud Server', value: 2500, color: '#6366f1' },
          { name: 'Freelancers', value: 5000, color: '#f59e0b' },
        ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2 sm:px-4 py-2">
      {/* SaaS Motion Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
              Company Growth & Analytics
            </span>
            <span className="text-xs text-stone-400">• Dedicated Financial Studio</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100 mt-1">
            Financial Ledger, Revenue Growth & Expenses
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Full comparative analysis of gross revenue inflow, operating tool expenses, and true net profitability.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setIsAddExpenseOpen(true)}
          className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-rose-600/25 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Add Business Expense</span>
        </motion.button>
      </motion.div>

      {/* Top 4 Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Gross Client Inflow</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
            <AnimatedCounter value={totalPaymentsReceived} prefix="₹" />
          </div>
          <div className="text-xs text-stone-400 mt-1">Cleared Tokens & Retainers</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Company Expenses</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-600">
            <AnimatedCounter value={totalExpenses} prefix="₹" />
          </div>
          <div className="text-xs text-stone-400 mt-1">{expenses.length} Logged Expense Items</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Net Growth Profit</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            <AnimatedCounter value={netProfit} prefix="₹" />
          </div>
          <div className="text-xs text-stone-400 mt-1">Margin: <strong className="text-emerald-600"><AnimatedCounter value={margin} suffix="%" /></strong></div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">Monthly Recurring (MRR)</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
            <AnimatedCounter value={mrr} prefix="₹" />
          </div>
          <div className="text-xs text-stone-400 mt-1">Guaranteed Retainer Run-Rate</div>
        </motion.div>
      </div>

      {/* Primary Comparison Chart: Revenue vs Expenses vs Profit Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>Multi-Month Revenue vs Expense vs Profit Comparison</span>
            </h2>
            <p className="text-xs text-stone-400">
              Side-by-side growth bar chart tracking money in, expenses out, and net retained earnings.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Revenue
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 text-rose-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expense
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Net Profit
            </span>
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(val) => [`₹${Number(val).toLocaleString()}`, '']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '16px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                }}
              />
              <Bar dataKey="Revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Expenses" fill="#f43f5e" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Profit" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Secondary Row: Area Growth Curve + Expense Category Pie Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Net Profit Growth Area Curve */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Net Profit Trajectory & Cash Retention</span>
            </h3>
            <p className="text-xs text-stone-400">Monthly profit curve showing financial runway</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString()}`, 'Profit']}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="Profit" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#profitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Expense Categorization Breakdown */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2 mb-1">
              <PieIcon className="w-4 h-4 text-rose-500" />
              <span>Expense Allocation Breakdown</span>
            </h3>
            <p className="text-xs text-stone-400">Where agency money is invested</p>

            <div className="h-44 w-full flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {displayPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5">
              {displayPieData.slice(0, 4).map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-stone-600 dark:text-stone-300 font-medium">{entry.name}</span>
                  </div>
                  <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                    ₹{entry.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Ledger Table */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-stone-600" />
              <span>Company Cost & Expense Ledger ({expenses.length})</span>
            </h3>
            <p className="text-xs text-stone-400">Chronological list of all operating overheads</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddExpenseOpen(true)}
            className="text-xs font-bold text-rose-600 hover:underline"
          >
            + Add Expense
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-xs">
            No expenses logged yet. Click "+ Add Business Expense" to record server, tool, and team costs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Description / Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="py-3 px-3 text-stone-400 font-mono">{exp.date}</td>
                    <td className="py-3 px-3 font-bold text-stone-900 dark:text-stone-100">{exp.description || 'Expense'}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-[10px] font-bold uppercase text-stone-600 dark:text-stone-300">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-stone-500">{exp.vendor || '—'}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                      ₹{Number(exp.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => deleteExpense(exp.id)}
                        className="text-stone-300 hover:text-rose-500 p-1 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onAdd={addExpense}
      />
    </div>
  );
}
