import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  FileText,
  CreditCard,
  Repeat,
  TrendingDown,
  Printer,
  Share2,
  Mail,
  AlertCircle,
  Search,
  Filter,
} from 'lucide-react';
import { db } from '../../db/database.js';
import { invoicesRepo } from '../../db/repositories/invoicesRepo.js';
import { paymentsRepo } from '../../db/repositories/paymentsRepo.js';
import { subscriptionsRepo } from '../../db/repositories/subscriptionsRepo.js';
import { expensesRepo } from '../../db/repositories/expensesRepo.js';
import { roundMoney } from '../../utils/finance.js';
import { InvoiceFormModal } from '../../components/forms/InvoiceFormModal.jsx';
import { InvoicePrintModal } from '../../components/common/InvoicePrintModal.jsx';
import { PaymentFormModal } from '../../components/forms/PaymentFormModal.jsx';
import { SubscriptionFormModal } from '../../components/forms/SubscriptionFormModal.jsx';
import { ExpenseFormModal } from '../../components/forms/ExpenseFormModal.jsx';
import { generateWhatsAppLink, WHATSAPP_TEMPLATES } from '../../utils/whatsapp.js';
import { sendRenewalAlerts } from '../../utils/email.js';

export function FinancePage() {
  const [activeTab, setActiveTab] = useState('invoices'); // invoices, payments, subscriptions, expenses
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState({});
  const [mrr, setMrr] = useState(0);
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentPresetInvoice, setPaymentPresetInvoice] = useState(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState(null);

  const loadAllFinanceData = async () => {
    setIsLoading(true);
    try {
      const [invList, payList, subList, expList, allClients, calculatedMrr] = await Promise.all([
        invoicesRepo.getAll({}, db),
        paymentsRepo.getAll({}, db),
        subscriptionsRepo.getAll({}, db),
        expensesRepo.getAll({}, db),
        db.clients ? db.clients.toArray() : [],
        subscriptionsRepo.getMRR(db),
      ]);

      const clientMap = {};
      allClients.forEach((c) => {
        clientMap[c.id] = c;
      });

      setInvoices(invList);
      setPayments(payList);
      setSubscriptions(subList);
      setExpenses(expList);
      setClients(clientMap);
      setMrr(calculatedMrr);
    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllFinanceData();
  }, []);

  // Compute live aggregates from actual records
  const totalInvoiced = roundMoney(
    invoices.filter((i) => i.status !== 'void').reduce((sum, i) => sum + (Number(i.total) || 0), 0)
  );
  const totalCashCollected = roundMoney(
    payments
      .filter((p) => p.status === 'recorded')
      .reduce((sum, p) => {
        if (p.type === 'payment') return sum + (Number(p.amount) || 0);
        if (p.type === 'refund') return sum - (Number(p.amount) || 0);
        if (p.type === 'adjustment') return sum + (Number(p.amount) || 0);
        return sum;
      }, 0)
  );
  const outstandingReceivables = roundMoney(
    invoices
      .filter((i) => i.status !== 'void' && i.status !== 'paid' && i.status !== 'draft')
      .reduce((sum, i) => sum + Math.max(0, (Number(i.total) || 0) - (Number(i.paidAmount) || 0)), 0)
  );
  const overdueAmount = roundMoney(
    invoices
      .filter((i) => i.status === 'overdue')
      .reduce((sum, i) => sum + Math.max(0, (Number(i.total) || 0) - (Number(i.paidAmount) || 0)), 0)
  );
  const totalExpenses = roundMoney(expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceFilter !== 'all' && inv.status !== invoiceFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.clientName && inv.clientName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleRecordInvoicePayment = (inv) => {
    const due = Math.max(0, roundMoney((Number(inv.total) || 0) - (Number(inv.paidAmount) || 0)));
    setPaymentPresetInvoice({
      clientId: inv.clientId,
      invoiceId: inv.id,
      amount: due,
    });
    setIsPaymentModalOpen(true);
  };

  const [renewalSendingId, setRenewalSendingId] = useState(null);
  const [renewalAlertFeedback, setRenewalAlertFeedback] = useState('');

  const handleGenerateRetainerInvoice = async (sub) => {
    try {
      await subscriptionsRepo.generateNextInvoice(sub.id, db);
      loadAllFinanceData();
    } catch (err) {
      alert(`Could not generate retainer invoice: ${err.message}`);
    }
  };

  const handleSendRenewalAlert = async (sub) => {
    const client = clients[sub.clientId];
    try {
      setRenewalSendingId(sub.id);
      setRenewalAlertFeedback('');
      const res = await sendRenewalAlerts({ subscription: sub, client });
      const msgs = [];
      if (res.clientSent) msgs.push(`Client (${client?.email}) notified`);
      if (res.ownerSent) msgs.push('Copy sent to your email');
      if (res.errors.length) msgs.push(`Notice: ${res.errors.join(', ')}`);
      setRenewalAlertFeedback(msgs.join(' • ') || 'Renewal alert sent successfully!');
    } catch (err) {
      setRenewalAlertFeedback(`Failed to send alert: ${err.message}`);
    } finally {
      setRenewalSendingId(null);
    }
  };

  const handleVoidInvoice = async (inv) => {
    if (confirm(`Are you sure you want to void invoice ${inv.invoiceNumber}? This action is auditable.`)) {
      try {
        await invoicesRepo.voidInvoice(inv.id, 'Voided by user', db);
        loadAllFinanceData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Agency Finance & Billing
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Invoicing, cash collection, monthly retainers, and operating expenses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingInvoice(null);
              setIsInvoiceModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPaymentPresetInvoice(null);
              setIsPaymentModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/80 border border-stone-200 dark:border-stone-700 rounded-xl transition-colors"
          >
            <CreditCard className="w-4 h-4 text-stone-500" />
            <span>Record Payment</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSubscriptionModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/80 border border-stone-200 dark:border-stone-700 rounded-xl transition-colors"
          >
            <Repeat className="w-4 h-4 text-stone-500" />
            <span>New Retainer</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/80 border border-stone-200 dark:border-stone-700 rounded-xl transition-colors"
          >
            <TrendingDown className="w-4 h-4 text-stone-500" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Top Financial Health KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Monthly Retainers (MRR)</div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{mrr.toLocaleString()}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">{subscriptions.filter((s) => s.status === 'active').length} active retainers</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Cash Received</div>
          <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100 mt-1">
            ₹{totalCashCollected.toLocaleString()}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">Cleared net cash</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Outstanding Receivables</div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            ₹{outstandingReceivables.toLocaleString()}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">Awaiting clearance</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Overdue Invoices</div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
            ₹{overdueAmount.toLocaleString()}
          </div>
          <div className="text-[10px] text-rose-500 mt-0.5">{invoices.filter((i) => i.status === 'overdue').length} past due date</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs col-span-2 lg:col-span-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Total Expenses</div>
          <div className="text-xl font-bold font-mono text-stone-700 dark:text-stone-300 mt-1">
            ₹{totalExpenses.toLocaleString()}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">{expenses.length} expense entries</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200 dark:border-stone-800">
        <nav className="flex space-x-6">
          {[
            { id: 'invoices', label: `Invoices (${invoices.length})`, icon: FileText },
            { id: 'payments', label: `Payments (${payments.length})`, icon: CreditCard },
            { id: 'subscriptions', label: `Retainers (${subscriptions.length})`, icon: Repeat },
            { id: 'expenses', label: `Expenses (${expenses.length})`, icon: TrendingDown },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition-colors ${
                  active
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All Invoices' },
                { id: 'unpaid', label: 'Unpaid' },
                { id: 'partially_paid', label: 'Partially Paid' },
                { id: 'overdue', label: 'Overdue' },
                { id: 'paid', label: 'Paid' },
                { id: 'draft', label: 'Draft' },
                { id: 'void', label: 'Void' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setInvoiceFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    invoiceFilter === f.id
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                      : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search invoice # or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Invoices List / Cards */}
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl">
              <FileText className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">No invoices found</p>
              <p className="text-xs text-stone-400 mt-1">Create your first client invoice to start tracking billings</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredInvoices.map((inv) => {
                  const client = clients[inv.clientId];
                  const balanceDue = Math.max(0, roundMoney((Number(inv.total) || 0) - (Number(inv.paidAmount) || 0)));

                  return (
                    <div
                      key={inv.id}
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100">
                            {inv.invoiceNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              inv.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : inv.status === 'overdue'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : inv.status === 'partially_paid'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                : inv.status === 'void'
                                ? 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                          {inv.clientName || client?.name || 'Client'}
                          {client?.businessName ? ` • ${client.businessName}` : ''}
                        </p>
                        <p className="text-[11px] text-stone-400">
                          Issued {inv.issueDate} • Due {inv.dueDate}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                        <div className="text-right">
                          <div className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100">
                            ₹{Number(inv.total || 0).toLocaleString()}
                          </div>
                          {balanceDue > 0 && inv.status !== 'void' ? (
                            <div className="text-[11px] font-mono text-rose-600 dark:text-rose-400">
                              Due: ₹{balanceDue.toLocaleString()}
                            </div>
                          ) : (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Paid in full</div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPrintInvoice(inv)}
                            title="View & Print Invoice / Receipt"
                            className="p-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {balanceDue > 0 && inv.status !== 'void' && (
                            <button
                              type="button"
                              onClick={() => handleRecordInvoicePayment(inv)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-lg transition-colors"
                            >
                              Pay
                            </button>
                          )}

                          {inv.status !== 'void' && (
                            <button
                              type="button"
                              onClick={() => handleVoidInvoice(inv)}
                              className="text-[11px] text-stone-400 hover:text-rose-600 px-2 py-1 rounded-lg transition-colors"
                            >
                              Void
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">No payment records yet</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {payments.map((p) => {
                  const client = clients[p.clientId];
                  return (
                    <div
                      key={p.id}
                      className="p-4 flex items-center justify-between hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100">
                            {p.type === 'refund' ? '- ' : ''}₹{Number(p.amount).toLocaleString()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              p.status === 'recorded'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : p.status === 'void'
                                ? 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {p.type} • {p.status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                          {client ? client.name : 'Client'} • {p.method.replace('_', ' ')}
                          {p.reference ? ` • Ref: ${p.reference}` : ''}
                        </p>
                        <p className="text-[11px] text-stone-400">{p.paidAt ? p.paidAt.slice(0, 10) : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTIONS & RETAINERS */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          {renewalAlertFeedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-medium">🔔 {renewalAlertFeedback}</span>
              <button
                type="button"
                onClick={() => setRenewalAlertFeedback('')}
                className="underline opacity-75 hover:opacity-100 ml-3"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl">
                <Repeat className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">No active retainers</p>
                <p className="text-xs text-stone-400 mt-1">Set up recurring monthly client retainers with anchor-day preservation</p>
              </div>
            ) : (
              subscriptions.map((sub) => {
                const client = clients[sub.clientId];
                const renewalDate = sub.nextInvoiceDate || sub.renewalDate;
                const whatsappUrl = client?.phone
                  ? generateWhatsAppLink(
                      client.phone,
                      WHATSAPP_TEMPLATES.subscriptionRenewal({
                        clientName: client.name,
                        planTitle: sub.title,
                        amount: sub.monthlyAmount,
                        renewalDate: renewalDate || 'Due date',
                      })
                    )
                  : null;

                return (
                  <div
                    key={sub.id}
                    className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-bold text-sm text-stone-900 dark:text-stone-100">{sub.title}</span>
                          <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                            {sub.clientName || client?.name}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">
                          ₹{Number(sub.monthlyAmount).toLocaleString()}
                          <span className="text-xs font-normal text-stone-400">/{sub.billingFrequency}</span>
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-stone-100 dark:border-stone-800">
                        <div>
                          <span className="block text-[10px] uppercase font-semibold text-stone-400">Anchor Day:</span>
                          <span className="font-medium text-stone-700 dark:text-stone-300 font-mono">
                            Day {sub.billingAnchorDay}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-semibold text-stone-400">Next Renewal:</span>
                          <span className="font-medium text-stone-700 dark:text-stone-300 font-mono">
                            {sub.nextInvoiceDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                      <span className="text-[11px] text-stone-400">
                        {sub.status === 'active' ? '● Recurring Active' : `Status: ${sub.status}`}
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Send WhatsApp Renewal Notice"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-lg transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSendRenewalAlert(sub)}
                          disabled={renewalSendingId === sub.id}
                          title="Send automated renewal notice to client and copy to owner"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>{renewalSendingId === sub.id ? 'Sending...' : 'Email Alert'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleGenerateRetainerInvoice(sub)}
                          className="px-2.5 py-1 text-xs font-medium text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 rounded-lg transition-colors"
                        >
                          Invoice Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
            {expenses.length === 0 ? (
              <div className="text-center py-12">
                <TrendingDown className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">No expenses recorded</p>
                <p className="text-xs text-stone-400 mt-1">Track software, domain, or contractor costs</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-4 flex items-center justify-between hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100">
                          ₹{Number(exp.amount).toLocaleString()}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 uppercase">
                          {exp.category}
                        </span>
                      </div>
                      <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5">
                        {exp.vendor} {exp.description ? `• ${exp.description}` : ''}
                      </p>
                      <p className="text-[11px] text-stone-400">{exp.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <InvoiceFormModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        editInvoice={editingInvoice}
        onSaved={loadAllFinanceData}
      />

      <InvoicePrintModal
        isOpen={Boolean(printInvoice)}
        invoice={printInvoice}
        client={printInvoice ? clients[printInvoice.clientId] : null}
        onClose={() => setPrintInvoice(null)}
      />

      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentPresetInvoice(null);
        }}
        initialClientId={paymentPresetInvoice?.clientId}
        initialInvoiceId={paymentPresetInvoice?.invoiceId}
        initialAmount={paymentPresetInvoice?.amount}
        onSaved={loadAllFinanceData}
      />

      <SubscriptionFormModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onSaved={loadAllFinanceData}
      />

      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSaved={loadAllFinanceData}
      />
    </div>
  );
}
