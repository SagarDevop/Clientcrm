import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../../hooks/useClients.js';
import { ClientFormModal } from '../../components/forms/ClientFormModal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { generateWhatsAppLink, WHATSAPP_TEMPLATES } from '../../utils/whatsapp.js';
import { sendClientCompletionEmails } from '../../utils/email.js';
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
  Calendar,
} from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();
  const { clients, isLoading } = useClients();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [completionSendingId, setCompletionSendingId] = useState(null);
  const [completionFeedback, setCompletionFeedback] = useState(null);

  if (isLoading) {
    return <LoadingSpinner text="Loading dashboard..." size="lg" className="min-h-[50vh]" />;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysLaterStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const activeClients = clients.filter((c) => c.status === 'active');

  // Metrics
  const totalMonthlyContracted = activeClients.reduce(
    (sum, c) => sum + (Number(c.monthlyPlanAmount) || 0),
    0
  );

  const totalPaymentsReceived = activeClients.reduce(
    (sum, c) => sum + (Number(c.totalPaid) || (Number(c.tokenPaid) || 0) + (Number(c.additionalPaid) || 0)),
    0
  );

  const totalRemainingDue = activeClients.reduce(
    (sum, c) =>
      sum +
      Math.max(
        0,
        Number(
          c.remainingAmount !== undefined
            ? c.remainingAmount
            : (Number(c.monthlyPlanAmount) || 0) - (Number(c.totalPaid) || 0)
        )
      ),
    0
  );

  // Expiring Soon (Within 7 days or overdue)
  const expiringClients = activeClients.filter((c) => {
    if (!c.completionDate) return false;
    return c.completionDate <= sevenDaysLaterStr;
  });

  // Recently Onboarded (last 5)
  const recentClients = [...clients]
    .sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate))
    .slice(0, 5);

  const handleSendCompletion = async (e, client) => {
    e.stopPropagation();
    try {
      setCompletionSendingId(client.id);
      setCompletionFeedback(null);
      const res = await sendClientCompletionEmails({ client, forceRetry: true });
      if (res.clientSent) {
        setCompletionFeedback({ type: 'success', text: `Completion notice sent to ${client.email}` });
      } else {
        setCompletionFeedback({ type: 'error', text: res.errors?.join('; ') || 'Failed to dispatch email' });
      }
    } catch (err) {
      setCompletionFeedback({ type: 'error', text: err.message });
    } finally {
      setCompletionSendingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Client & Monthly Plan Tracker
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Active clients, monthly contracted retainers, token collections, and automatic emails
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-xs"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Client</span>
        </button>
      </div>

      {completionFeedback && (
        <div
          className={`p-3 rounded-2xl text-xs font-medium flex items-center justify-between ${
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
        </div>
      )}

      {/* 4 Minimal Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Total Active Clients */}
        <div
          onClick={() => navigate('/clients')}
          className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-500 cursor-pointer transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Active Clients</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">{activeClients.length}</div>
          <div className="text-[11px] text-stone-400 mt-1 flex items-center">
            View active clients &rarr;
          </div>
        </div>

        {/* 2. Total Monthly Contracted */}
        <div
          onClick={() => navigate('/clients')}
          className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-500 cursor-pointer transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Monthly Contracted</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            ₹{totalMonthlyContracted.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Sum of active plans</div>
        </div>

        {/* 3. Payments Received */}
        <div
          onClick={() => navigate('/clients')}
          className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-500 cursor-pointer transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Payments Received</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
            ₹{totalPaymentsReceived.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Tokens + additional</div>
        </div>

        {/* 4. Remaining Payments Due */}
        <div
          onClick={() => navigate('/clients')}
          className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-rose-400 cursor-pointer transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Remaining Balance Due</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            ₹{totalRemainingDue.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Across active clients</div>
        </div>
      </div>

      {/* 5. Plans Expiring Soon (Within 7 Days / Today) */}
      <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Monthly Plans Expiring Soon ({expiringClients.length})
            </h2>
          </div>
          <span className="text-[11px] text-stone-400">Due within 7 days</span>
        </div>

        {expiringClients.length === 0 ? (
          <p className="text-xs text-stone-400 py-3 text-center">
            No active client plans expiring within the next 7 days. All plans are on track!
          </p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {expiringClients.map((client) => {
              const remaining = Number(client.remainingAmount || 0);
              const isOverdue = client.completionDate <= todayStr;
              const whatsappUrl = client.phone
                ? generateWhatsAppLink(
                    client.phone,
                    WHATSAPP_TEMPLATES.subscriptionRenewal({
                      clientName: client.name,
                      planTitle: client.packageDescription?.slice(0, 30) || 'Monthly Service Package',
                      amount: remaining > 0 ? remaining : client.monthlyPlanAmount,
                      renewalDate: client.completionDate,
                    })
                  )
                : null;

              return (
                <div
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/40 px-2 rounded-xl transition-colors"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {client.name}
                      </span>
                      <span className="text-xs text-stone-500 font-medium">({client.businessName})</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isOverdue ? 'Expiring Today' : `Due ${client.completionDate}`}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Plan: ₹{Number(client.monthlyPlanAmount || 0).toLocaleString()} • Balance Due:{' '}
                      <strong className="text-rose-600 font-mono">₹{remaining.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleSendCompletion(e, client)}
                      disabled={completionSendingId === client.id}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-50"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{completionSendingId === client.id ? 'Sending...' : 'Email Notice'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 p-1"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Recently Onboarded Clients */}
      <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Recently Onboarded Clients
          </h2>
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
          >
            All clients <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        </div>

        {recentClients.length === 0 ? (
          <p className="text-xs text-stone-400 py-3 text-center">No clients added yet.</p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {recentClients.map((client) => {
              const remaining = Number(client.remainingAmount || 0);
              const isPaid = remaining <= 0;

              return (
                <div
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="py-3 flex items-center justify-between text-xs cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/40 px-2 rounded-xl transition-colors"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                        {client.name}
                      </span>
                      <span className="text-stone-400 font-medium">{client.businessName}</span>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      Started: {client.startDate || '—'} &rarr; Completion: {client.completionDate || '—'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-stone-900 dark:text-stone-100">
                      ₹{Number(client.monthlyPlanAmount || 0).toLocaleString()}
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase ${
                        isPaid ? 'text-emerald-600' : 'text-rose-500'
                      }`}
                    >
                      {isPaid ? 'Paid in Full' : `Remaining: ₹${remaining.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      <ClientFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={(c) => navigate(`/clients/${c.id}`)}
      />
    </div>
  );
}
