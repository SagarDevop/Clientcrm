import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClient } from '../../hooks/useClients.js';
import { paymentsRepo } from '../../db/repositories/paymentsRepo.js';
import { db } from '../../db/database.js';
import { roundMoney } from '../../utils/finance.js';
import { generateWhatsAppLink, WHATSAPP_TEMPLATES } from '../../utils/whatsapp.js';
import { sendClientOnboardingEmails, sendClientCompletionEmails } from '../../utils/email.js';
import { ClientFormModal } from '../../components/forms/ClientFormModal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { WhatsAppModal } from '../../components/common/WhatsAppModal.jsx';
import { ClientReceiptModal } from '../../components/common/ClientReceiptModal.jsx';
import {
  ArrowLeft,
  Edit2,
  Share2,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Plus,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Printer,
  FileText,
} from 'lucide-react';

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { client, isLoading, updateClient, recordPayment, startNextMonth, archiveClient, restoreClient } =
    useClient(id);

  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Record Payment Modal State
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payNotes, setPayNotes] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [payError, setPayError] = useState('');

  // Start Next Month Modal State
  const [isStartNextMonthOpen, setIsStartNextMonthOpen] = useState(false);
  const [nextStartDate, setNextStartDate] = useState('');
  const [nextPlanAmount, setNextPlanAmount] = useState('');
  const [nextTokenPaid, setNextTokenPaid] = useState('0');
  const [isStartingNextMonth, setIsStartingNextMonth] = useState(false);

  // Email Action Feedback State
  const [emailActionLoading, setEmailActionLoading] = useState(false);
  const [emailActionFeedback, setEmailActionFeedback] = useState(null);

  // Show past periods toggle
  const [showPastPeriods, setShowPastPeriods] = useState(false);

  // 3-in-1 WhatsApp & Printable Receipt Modal States
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppTemplate, setWhatsAppTemplate] = useState('renewal');

  // Load payment history
  const loadPayments = async () => {
    if (!id || !db.payments) return;
    try {
      const list = await paymentsRepo.getAll({ clientId: id }, db);
      setPaymentHistory(list);
    } catch (err) {
      console.error('Error loading payment history:', err);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [id, client?.totalPaid]);

  if (isLoading) {
    return <LoadingSpinner text="Loading client profile..." size="lg" className="min-h-[50vh]" />;
  }

  if (!client) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Client record not found</p>
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-xl"
        >
          Back to Active Clients
        </button>
      </div>
    );
  }

  // Financial figures
  const planAmount = Number(client.monthlyPlanAmount || 0);
  const tokenPaid = Number(client.tokenPaid || 0);
  const additionalPaid = Number(client.additionalPaid || 0);
  const totalPaid = Number(client.totalPaid || tokenPaid + additionalPaid);
  const remainingAmount = Number(client.remainingAmount !== undefined ? client.remainingAmount : planAmount - totalPaid);

  const isFullyPaid = remainingAmount <= 0;

  // WhatsApp Reminder Link
  const whatsappReminderUrl = client.phone
    ? generateWhatsAppLink(
        client.phone,
        WHATSAPP_TEMPLATES.subscriptionRenewal({
          clientName: client.name,
          planTitle: client.packageDescription?.slice(0, 30) || 'Monthly Service Package',
          amount: remainingAmount > 0 ? remainingAmount : planAmount,
          renewalDate: client.completionDate || 'Due date',
        })
      )
    : null;

  // Handler: Record Additional Payment
  const handleSavePayment = async (e) => {
    e.preventDefault();
    setPayError('');
    const amt = Number(payAmount);

    if (amt <= 0) {
      setPayError('Payment amount must be greater than zero.');
      return;
    }
    if (amt > remainingAmount) {
      setPayError(`Payment cannot exceed remaining balance of ₹${remainingAmount.toLocaleString()}.`);
      return;
    }

    try {
      setIsRecordingPayment(true);
      await recordPayment({
        amount: amt,
        paymentMethod: payMethod,
        paidAt: payDate,
        notes: payNotes,
      });
      await loadPayments();
      setIsRecordPaymentOpen(false);
      setPayAmount('');
      setPayNotes('');
    } catch (err) {
      setPayError(err.message || 'Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Handler: Start Next Month
  const handleStartNextMonth = async (e) => {
    e.preventDefault();
    try {
      setIsStartingNextMonth(true);
      await startNextMonth({
        startDate: nextStartDate || client.completionDate,
        monthlyPlanAmount: Number(nextPlanAmount || planAmount),
        tokenPaid: Number(nextTokenPaid || 0),
      });
      await loadPayments();
      setIsStartNextMonthOpen(false);
    } catch (err) {
      alert(`Could not start next month: ${err.message}`);
    } finally {
      setIsStartingNextMonth(false);
    }
  };

  // Handler: Retry/Send Onboarding Email
  const handleSendOnboardingEmail = async () => {
    try {
      setEmailActionLoading(true);
      setEmailActionFeedback(null);
      const res = await sendClientOnboardingEmails({
        client,
        tokenAmount: tokenPaid,
        remainingAmount,
      });
      if (res.clientSent) {
        setEmailActionFeedback({ type: 'success', text: `Onboarding email sent to ${client.email}` });
      } else {
        setEmailActionFeedback({ type: 'error', text: res.errors.join('; ') || 'Failed to send onboarding email' });
      }
    } catch (err) {
      setEmailActionFeedback({ type: 'error', text: err.message });
    } finally {
      setEmailActionLoading(false);
    }
  };

  // Handler: Send/Retry Completion Email
  const handleSendCompletionEmail = async () => {
    try {
      setEmailActionLoading(true);
      setEmailActionFeedback(null);
      const res = await sendClientCompletionEmails({
        client,
        forceRetry: true,
      });
      if (res.clientSent) {
        setEmailActionFeedback({ type: 'success', text: `Completion reminder sent to ${client.email}` });
      } else if (res.skipped) {
        setEmailActionFeedback({ type: 'info', text: res.reason });
      } else {
        setEmailActionFeedback({ type: 'error', text: res.errors.join('; ') || 'Failed to dispatch email' });
      }
    } catch (err) {
      setEmailActionFeedback({ type: 'error', text: err.message });
    } finally {
      setEmailActionLoading(false);
    }
  };

  // Status toggle
  const handleToggleStatus = async () => {
    const newStatus = client.status === 'active' ? 'inactive' : 'active';
    await updateClient({ status: newStatus });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="p-2 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
            title="Back to Clients"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                {client.name}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                  client.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                }`}
              >
                {client.status}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              {client.businessName} • Onboarded on {client.startDate || client.createdAt?.slice(0, 10)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleToggleStatus}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
              client.status === 'active'
                ? 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {client.status === 'active' ? 'Mark Inactive' : 'Reactivate Client'}
          </button>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Details</span>
          </button>
        </div>
      </div>

      {/* Email Feedback Banner */}
      {emailActionFeedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between ${
            emailActionFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
              : emailActionFeedback.type === 'info'
              ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
          }`}
        >
          <span>{emailActionFeedback.text}</span>
          <button
            type="button"
            onClick={() => setEmailActionFeedback(null)}
            className="underline opacity-75 hover:opacity-100 ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Contact & Quick Connect Strip */}
      <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-stone-600 dark:text-stone-300">
          <div className="flex items-center space-x-1.5">
            <Mail className="w-4 h-4 text-stone-400" />
            <a href={`mailto:${client.email}`} className="font-medium hover:underline text-stone-900 dark:text-stone-100">
              {client.email}
            </a>
          </div>
          <div className="flex items-center space-x-1.5">
            <Phone className="w-4 h-4 text-stone-400" />
            <span className="font-mono">{client.phone}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              setWhatsAppTemplate(remainingAmount > 0 ? 'balance' : 'renewal');
              setIsWhatsAppOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-xl transition-colors min-touch-target"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp (3-in-1)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReceiptOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors min-touch-target"
          >
            <Printer className="w-3.5 h-3.5 text-stone-500" />
            <span>Receipt / Invoice</span>
          </button>
        </div>
      </div>

      {/* 2. Monthly Plan & Financial Balance Breakdown */}
      <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Monthly Plan & Payment Breakdown
          </h2>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
              isFullyPaid
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : tokenPaid > 0 || additionalPaid > 0
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {isFullyPaid ? 'Paid in Full' : tokenPaid > 0 || additionalPaid > 0 ? 'Partially Paid' : 'Unpaid'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Monthly Plan</span>
            <span className="text-base sm:text-lg font-bold font-mono text-stone-900 dark:text-stone-100">
              ₹{planAmount.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Token Received</span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ₹{tokenPaid.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Additional Paid</span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ₹{additionalPaid.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Received</span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">
              ₹{totalPaid.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-rose-500 block">Remaining Due</span>
            <span className="text-base sm:text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
              ₹{remainingAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Service Period Dates */}
        <div className="flex flex-wrap items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center space-x-2">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>
              Period: <strong>{client.startDate || '—'}</strong> &rarr; <strong>{client.completionDate || '—'}</strong>
            </span>
            <span className="text-[11px] text-stone-400">(Anchor Day: {client.billingAnchorDay || '—'})</span>
          </div>

          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            {remainingAmount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPayAmount(String(remainingAmount));
                  setIsRecordPaymentOpen(true);
                }}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setNextStartDate(client.completionDate || new Date().toISOString().slice(0, 10));
                setNextPlanAmount(String(planAmount));
                setNextTokenPaid('0');
                setIsStartNextMonthOpen(true);
              }}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start Next Month</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Service Package Description */}
      <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
          What Your Package Includes
        </h2>
        <div className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed bg-stone-50 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-100 dark:border-stone-800 font-sans">
          {client.packageDescription || 'No detailed package description recorded.'}
        </div>
        {client.notes && (
          <div className="text-xs text-stone-500 dark:text-stone-400 pt-2">
            <span className="font-semibold text-stone-600 dark:text-stone-300">Internal Notes: </span>
            {client.notes}
          </div>
        )}
      </div>

      {/* 4. Automated Emails & Delivery Status */}
      <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Mail className="w-4 h-4 text-emerald-600" />
          Automated Email Notification Status
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Onboarding Email Status */}
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-stone-800 dark:text-stone-200 block">Welcome Onboard Email</span>
              <span className="text-[11px] text-stone-400">Sent on initial client onboarding</span>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  client.onboardingEmailStatus === 'sent'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}
              >
                {client.onboardingEmailStatus || 'Pending'}
              </span>
              <button
                type="button"
                onClick={handleSendOnboardingEmail}
                disabled={emailActionLoading}
                className="px-2 py-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg"
              >
                {client.onboardingEmailStatus === 'sent' ? 'Resend' : 'Send'}
              </button>
            </div>
          </div>

          {/* Completion Reminder Status */}
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-stone-800 dark:text-stone-200 block">1-Month Completion Email</span>
              <span className="text-[11px] text-stone-400">Due on {client.completionDate || 'Completion Date'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  client.completionEmailStatus === 'sent'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {client.completionEmailStatus || 'Pending'}
              </span>
              <button
                type="button"
                onClick={handleSendCompletionEmail}
                disabled={emailActionLoading}
                className="px-2 py-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg"
              >
                {client.completionEmailStatus === 'sent' ? 'Resend' : 'Send Now'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Payment History */}
      <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Payment History ({paymentHistory.length})
          </h2>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsReceiptOpen(true)}
              className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            {remainingAmount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPayAmount(String(remainingAmount));
                  setIsRecordPaymentOpen(true);
                }}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                + Record Payment
              </button>
            )}
          </div>
        </div>

        {paymentHistory.length === 0 ? (
          <p className="text-xs text-stone-400 py-3 text-center">No payment transactions recorded yet.</p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {paymentHistory.map((pay) => (
              <div key={pay.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-stone-900 dark:text-stone-100 capitalize">
                      {pay.type === 'token' ? 'Token Payment' : 'Additional Payment'}
                    </span>
                    <span className="text-[10px] text-stone-400 uppercase font-mono">{pay.paymentMethod || 'Transfer'}</span>
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    {pay.paidAt ? pay.paidAt.slice(0, 10) : '—'} {pay.notes ? `• ${pay.notes}` : ''}
                  </div>
                </div>
                <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  ₹{Number(pay.amount || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Past Monthly Periods History (If Any) */}
      {client.periods && client.periods.length > 0 && (
        <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
          <button
            type="button"
            onClick={() => setShowPastPeriods(!showPastPeriods)}
            className="w-full flex items-center justify-between text-left text-sm font-bold text-stone-900 dark:text-stone-100"
          >
            <span>Past Monthly Periods ({client.periods.length})</span>
            {showPastPeriods ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showPastPeriods && (
            <div className="space-y-3 pt-2">
              {client.periods.map((period, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      Month #{period.periodNumber || idx + 1}: {period.startDate} &rarr; {period.completionDate}
                    </span>
                    <span className="font-mono font-bold text-emerald-600">
                      ₹{Number(period.monthlyPlanAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Total Collected: ₹{Number(period.totalPaid || 0).toLocaleString()} • Remaining: ₹
                    {Number(period.remainingAmount || 0).toLocaleString()} • Status:{' '}
                    <span className="font-semibold uppercase">{period.paymentStatus || 'Completed'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Record Additional Payment */}
      <Modal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        title={`Record Payment for ${client.name}`}
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          {payError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs">
              {payError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Payment Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="1"
              max={remainingAmount}
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full px-3 py-2 text-base font-mono font-bold rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
            <span className="text-[11px] text-stone-400">
              Remaining balance due: ₹{remainingAmount.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Payment Method
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
              >
                <option value="bank_transfer">Bank Transfer / NEFT</option>
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="cash">Cash</option>
                <option value="card">Card / Gateway</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Transaction Reference / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. UTR / Transaction ID or note"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setIsRecordPaymentOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRecordingPayment}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl disabled:opacity-50"
            >
              {isRecordingPayment ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Start Next Month */}
      <Modal
        isOpen={isStartNextMonthOpen}
        onClose={() => setIsStartNextMonthOpen(false)}
        title={`Start Next Month for ${client.name}`}
      >
        <form onSubmit={handleStartNextMonth} className="space-y-4">
          <p className="text-xs text-stone-500">
            Confirming the new period will archive the current month's record, update the service dates using the original anchor day ({client.billingAnchorDay}th), and reset the monthly billing cycle.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                New Period Start Date
              </label>
              <input
                type="date"
                required
                value={nextStartDate}
                onChange={(e) => setNextStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Monthly Plan Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                required
                value={nextPlanAmount}
                onChange={(e) => setNextPlanAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Token / Advance Received for Next Month (₹)
            </label>
            <input
              type="number"
              min="0"
              value={nextTokenPaid}
              onChange={(e) => setNextTokenPaid(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 font-mono"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setIsStartNextMonthOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isStartingNextMonth}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl disabled:opacity-50"
            >
              {isStartingNextMonth ? 'Starting Next Month...' : 'Confirm Next Month'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Client Modal */}
      <ClientFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={client}
      />

      {/* Printable Receipt & Invoice Modal */}
      <ClientReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        client={client}
        payments={paymentHistory}
        onOpenWhatsApp={() => {
          setIsReceiptOpen(false);
          setWhatsAppTemplate(remainingAmount > 0 ? 'balance' : 'renewal');
          setIsWhatsAppOpen(true);
        }}
      />

      {/* 3-in-1 WhatsApp Smart Messenger Modal */}
      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        client={client}
        defaultTemplate={whatsAppTemplate}
      />
    </div>
  );
}
