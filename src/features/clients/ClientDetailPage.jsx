import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClient } from '../../hooks/useClients.js';
import { paymentsRepo } from '../../db/repositories/paymentsRepo.js';
import { quotationsRepo } from '../../db/repositories/quotationsRepo.js';
import { db } from '../../db/database.js';
import {
  sendClientOnboardingEmails,
  sendClientCompletionEmails,
  sendWebDevOnboardingEmails,
  sendWebDevDeliveryEmails,
} from '../../utils/email.js';
import { ClientFormModal } from '../../components/forms/ClientFormModal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { WhatsAppModal } from '../../components/common/WhatsAppModal.jsx';
import { ClientReceiptModal } from '../../components/common/ClientReceiptModal.jsx';
import { QuotationModal } from '../../components/common/QuotationModal.jsx';
import {
  ArrowLeft,
  Edit2,
  Share2,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Plus,
  ChevronDown,
  ChevronUp,
  Printer,
  FileText,
  QrCode,
  Globe,
  Code,
  Layers,
  ExternalLink,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react';

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    client,
    isLoading,
    updateClient,
    recordPayment,
    recordWebDevPayment,
    updateWebDevDeliveryStatus,
    addProjectDocument,
    removeProjectDocument,
    toggleProjectDeliverable,
    addProjectDeliverable,
    startNextMonth,
    archiveClient,
    restoreClient,
  } = useClient(id);

  const [paymentHistory, setPaymentHistory] = useState([]);
  const [quotationRecord, setQuotationRecord] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Content Record Payment Modal State
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payNotes, setPayNotes] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [payError, setPayError] = useState('');

  // Start Next Month Modal State (Content Clients)
  const [isStartNextMonthOpen, setIsStartNextMonthOpen] = useState(false);
  const [nextStartDate, setNextStartDate] = useState('');
  const [nextPlanAmount, setNextPlanAmount] = useState('');
  const [nextTokenPaid, setNextTokenPaid] = useState('0');
  const [isStartingNextMonth, setIsStartingNextMonth] = useState(false);

  // Email Action Feedback State
  const [emailActionLoading, setEmailActionLoading] = useState(false);
  const [emailActionFeedback, setEmailActionFeedback] = useState(null);

  // Show past periods toggle (Content Clients)
  const [showPastPeriods, setShowPastPeriods] = useState(false);

  // 3-in-1 WhatsApp & Printable Receipt / Quotation Modal States
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppTemplate, setWhatsAppTemplate] = useState('renewal');

  // Add Document Modal State (Web Dev)
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('figma');
  const [docUrl, setDocUrl] = useState('');

  // Add Deliverable Modal State (Web Dev)
  const [isAddDeliverableOpen, setIsAddDeliverableOpen] = useState(false);
  const [newDeliverableTitle, setNewDeliverableTitle] = useState('');

  // Load payment history and quotation
  const loadPaymentsAndQuotation = async () => {
    if (!id) return;
    try {
      if (db.payments) {
        const list = await paymentsRepo.getAll({ clientId: id }, db);
        setPaymentHistory(list);
      }
      if (db.quotations) {
        const q = await quotationsRepo.getByClientId(id, db);
        setQuotationRecord(q);
      }
    } catch (err) {
      console.error('Error loading payments or quotation:', err);
    }
  };

  useEffect(() => {
    loadPaymentsAndQuotation();
  }, [id, client?.totalPaid, client?.remainingAmount]);

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

  const isWebDev = client.clientType === 'web_development' || client.category === 'web_dev';

  // Financial figures
  const planAmount = Number(
    isWebDev ? (client.totalProjectCost || client.agreedAmount || 0) : (client.monthlyPlanAmount || 0)
  );
  const tokenPaid = Number(client.tokenPaid || client.advancePaid || 0);
  const additionalPaid = Number(client.additionalPaid || 0);
  const totalPaid = Number(client.totalPaid || tokenPaid + additionalPaid);
  const remainingAmount = Number(
    client.remainingAmount !== undefined ? client.remainingAmount : Math.max(0, planAmount - totalPaid)
  );
  const isFullyPaid = remainingAmount <= 0;

  // Deliverables stats for Web Dev
  const deliverables = client.deliverables || [];
  const completedDeliverablesCount = deliverables.filter((d) => d.status === 'completed').length;
  const deliverablesProgress =
    deliverables.length > 0 ? Math.round((completedDeliverablesCount / deliverables.length) * 100) : 0;

  // Documents for Web Dev
  const documents = client.documents || [];

  // Handler: Record Payment (Handles both Content Management & Web Dev)
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
      if (isWebDev) {
        await recordWebDevPayment({
          amount: amt,
          paymentMethod: payMethod,
          paidAt: payDate,
          notes: payNotes,
        });
      } else {
        await recordPayment({
          amount: amt,
          paymentMethod: payMethod,
          paidAt: payDate,
          notes: payNotes,
        });
      }
      await loadPaymentsAndQuotation();
      setIsRecordPaymentOpen(false);
      setPayAmount('');
      setPayNotes('');
    } catch (err) {
      setPayError(err.message || 'Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Handler: Start Next Month (Content Clients)
  const handleStartNextMonth = async (e) => {
    e.preventDefault();
    try {
      setIsStartingNextMonth(true);
      await startNextMonth({
        startDate: nextStartDate || client.completionDate,
        monthlyPlanAmount: Number(nextPlanAmount || planAmount),
        tokenPaid: Number(nextTokenPaid || 0),
      });
      await loadPaymentsAndQuotation();
      setIsStartNextMonthOpen(false);
    } catch (err) {
      alert(`Could not start next month: ${err.message}`);
    } finally {
      setIsStartingNextMonth(false);
    }
  };

  // Handler: Status change
  const handleToggleStatus = async () => {
    const newStatus = client.status === 'active' ? 'inactive' : 'active';
    await updateClient({ status: newStatus });
  };

  // Handler: Web Dev Delivery Status Change
  const handleChangeDeliveryStatus = async (newDeliveryStatus) => {
    try {
      await updateWebDevDeliveryStatus(newDeliveryStatus);
    } catch (err) {
      alert(`Could not update delivery status: ${err.message}`);
    }
  };

  // Handler: Add Document Link
  const handleSaveDocument = async (e) => {
    e.preventDefault();
    if (!docUrl.trim()) return;
    try {
      await addProjectDocument({
        title: docTitle.trim() || 'Project Asset',
        type: docType,
        url: docUrl.trim(),
      });
      setIsAddDocOpen(false);
      setDocTitle('');
      setDocUrl('');
    } catch (err) {
      alert(`Failed to add document: ${err.message}`);
    }
  };

  // Handler: Add Deliverable
  const handleSaveDeliverable = async (e) => {
    e.preventDefault();
    if (!newDeliverableTitle.trim()) return;
    try {
      await addProjectDeliverable(newDeliverableTitle.trim());
      setIsAddDeliverableOpen(false);
      setNewDeliverableTitle('');
    } catch (err) {
      alert(`Failed to add deliverable: ${err.message}`);
    }
  };

  // Handler: Toggle Deliverable Checkbox
  const handleToggleDeliverable = async (delId, currentStatus) => {
    const nextCompleted = currentStatus !== 'completed';
    try {
      await toggleProjectDeliverable(delId, nextCompleted);
    } catch (err) {
      console.error('Error toggling deliverable:', err);
    }
  };

  // Handler: Send Onboarding Email (Content or Web Dev)
  const handleSendOnboardingEmail = async () => {
    try {
      setEmailActionLoading(true);
      setEmailActionFeedback(null);
      if (isWebDev) {
        const res = await sendWebDevOnboardingEmails({
          client,
          project: {
            name: client.projectName,
            description: client.projectDescription,
            startDate: client.startDate,
            deadline: client.deliveryDate,
          },
          quotation: quotationRecord || {
            quotationNumber: client.quotationNumber,
            items: client.quotationItems,
            totalAmount: planAmount,
            paymentTerms: client.paymentTerms,
          },
          advanceAmount: tokenPaid,
          remainingAmount,
        });
        if (res.clientSent) {
          setEmailActionFeedback({ type: 'success', text: `Quotation & onboarding email sent to ${client.email}` });
        } else {
          setEmailActionFeedback({ type: 'error', text: res.errors.join('; ') || 'Failed to dispatch email' });
        }
      } else {
        const res = await sendClientOnboardingEmails({
          client,
          tokenAmount: tokenPaid,
          remainingAmount,
        });
        if (res.clientSent) {
          setEmailActionFeedback({ type: 'success', text: `Onboarding email sent to ${client.email}` });
        } else {
          setEmailActionFeedback({ type: 'error', text: res.errors.join('; ') || 'Failed to dispatch email' });
        }
      }
    } catch (err) {
      setEmailActionFeedback({ type: 'error', text: err.message });
    } finally {
      setEmailActionLoading(false);
    }
  };

  // Handler: Send Completion Email (Content completion or Web Dev Handover)
  const handleSendCompletionEmail = async () => {
    try {
      setEmailActionLoading(true);
      setEmailActionFeedback(null);
      if (isWebDev) {
        const res = await sendWebDevDeliveryEmails({
          client,
          project: { name: client.projectName },
        });
        if (res.clientSent) {
          setEmailActionFeedback({ type: 'success', text: `Project delivery & handover notice sent to ${client.email}` });
        } else {
          setEmailActionFeedback({ type: 'error', text: res.errors.join('; ') || 'Failed to dispatch email' });
        }
      } else {
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
      }
    } catch (err) {
      setEmailActionFeedback({ type: 'error', text: err.message });
    } finally {
      setEmailActionLoading(false);
    }
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
              {/* Client Type Badge */}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                  isWebDev
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}
              >
                {isWebDev ? <Code className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                <span>{isWebDev ? 'Web Development' : 'Content Management'}</span>
              </span>

              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                  client.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                }`}
              >
                {client.status}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
              {client.businessName} • {isWebDev ? `Project: ${client.projectName || 'Website'}` : '1-Month Plan'} • Started on{' '}
              {client.startDate || client.createdAt?.slice(0, 10)}
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

      {/* Contact & Quick Connect Strip */}
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
          {/* WhatsApp Action */}
          <button
            type="button"
            onClick={() => {
              setWhatsAppTemplate(isWebDev ? 'quotation' : remainingAmount > 0 ? 'balance' : 'renewal');
              setIsWhatsAppOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-xl transition-colors min-touch-target"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          {/* Receipt or Quotation Action */}
          {isWebDev ? (
            <button
              type="button"
              onClick={() => setIsQuotationModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors min-touch-target"
            >
              <Printer className="w-3.5 h-3.5 text-stone-500" />
              <span>Quotation PDF</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsReceiptOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors min-touch-target"
            >
              <Printer className="w-3.5 h-3.5 text-stone-500" />
              <span>Receipt / Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: WEB DEVELOPMENT WORKFLOW VIEW                        */}
      {/* ============================================================== */}
      {isWebDev ? (
        <div className="space-y-6">
          {/* 1A. Project Delivery & Status Tracking Hero Bar */}
          <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Project Delivery Status
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                    {client.projectName || `${client.businessName} Website`}
                  </h2>
                </div>
              </div>

              {/* Status Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400">Status:</span>
                <select
                  value={client.deliveryStatus || 'planning'}
                  onChange={(e) => handleChangeDeliveryStatus(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-emerald-500 capitalize"
                >
                  <option value="planning">Planning & Architecture</option>
                  <option value="in_progress">In Development</option>
                  <option value="review">Client Review & QA</option>
                  <option value="completed">Completed & Handed Over</option>
                </select>
              </div>
            </div>

            {/* Timeline & Progress Bar */}
            <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>
                    Kickoff: <strong>{client.startDate || '—'}</strong> &rarr; Expected Delivery:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {client.deliveryDate || client.completionDate || '—'}
                    </strong>
                  </span>
                </span>
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  {completedDeliverablesCount} of {deliverables.length} Deliverables ({deliverablesProgress}%)
                </span>
              </div>

              <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${deliverablesProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* 1B. Financial Ledger & Balance Breakdown */}
          <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Project Financial Ledger & Balances
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
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Cost</span>
                <span className="text-base sm:text-lg font-bold font-mono text-stone-900 dark:text-stone-100">
                  ₹{planAmount.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Advance Token</span>
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
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-rose-500 block">Remaining Due</span>
                  {remainingAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsQuotationModalOpen(true)}
                      className="text-[10px] font-bold text-rose-700 dark:text-rose-300 hover:underline inline-flex items-center gap-0.5"
                    >
                      <QrCode className="w-3 h-3" />
                      <span>UPI QR</span>
                    </button>
                  )}
                </div>
                <span className="text-base sm:text-lg font-bold font-mono text-rose-600 dark:text-rose-400 block mt-0.5">
                  ₹{remainingAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100 dark:border-stone-800">
              <span>
                Payment Terms: <strong>{client.paymentTerms || '50% advance, 50% on project delivery'}</strong>
              </span>

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
                    <span>Record Project Payment</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 1C. Quotation & Scope Details Card */}
          <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Quotation #{client.quotationNumber || 'QT-WEB'}
                </h2>
                <p className="text-[11px] text-stone-400">
                  Itemized services, deliverables scope, and custom pricing
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsQuotationModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-xl transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>View & Print Quotation PDF</span>
              </button>
            </div>

            {/* Line items list */}
            <div className="rounded-2xl border border-stone-100 dark:border-stone-800 overflow-hidden divide-y divide-stone-100 dark:divide-stone-800 text-xs">
              {(client.quotationItems || [
                { name: client.projectName, description: client.projectDescription, quantity: 1, total: planAmount },
              ]).map((item, idx) => (
                <div key={idx} className="p-3 flex items-start justify-between gap-3 bg-stone-50/50 dark:bg-stone-800/20">
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono text-stone-400 font-bold text-[11px] mt-0.5">{idx + 1}.</span>
                    <div>
                      <span className="font-bold text-stone-800 dark:text-stone-200">{item.name}</span>
                      {item.description && (
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                      ₹{Number(item.total || item.unitPrice || 0).toLocaleString()}
                    </span>
                    {item.quantity > 1 && (
                      <span className="text-[10px] text-stone-400 block font-mono">
                        {item.quantity} × ₹{Number(item.unitPrice || 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {client.discountAmount > 0 && (
              <div className="text-xs text-right text-emerald-600 dark:text-emerald-400 font-medium">
                Discount Applied: -₹{Number(client.discountAmount).toLocaleString()}
              </div>
            )}
          </div>

          {/* 1D. Milestone Deliverables Checklist */}
          <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Milestone Deliverables Checklist ({completedDeliverablesCount}/{deliverables.length})
                </h2>
                <p className="text-[11px] text-stone-400">
                  Check off project stages as they are delivered and verified
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddDeliverableOpen(true)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Milestone</span>
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {deliverables.map((del) => {
                const isCompleted = del.status === 'completed';
                return (
                  <div
                    key={del.id}
                    onClick={() => handleToggleDeliverable(del.id, del.status)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isCompleted
                        ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20 text-stone-800 dark:text-stone-200'
                        : 'border-stone-100 dark:border-stone-800 hover:border-stone-300 bg-stone-50/50 dark:bg-stone-800/30 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-600 flex-shrink-0" />
                      )}
                      <span className={`font-medium ${isCompleted ? 'line-through text-stone-400' : ''}`}>
                        {del.title}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                      }`}
                    >
                      {isCompleted ? 'Done' : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 1E. Project Documents & Links */}
          <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-emerald-600" />
                  Project Documents & Assets ({documents.length})
                </h2>
                <p className="text-[11px] text-stone-400">
                  Quick links to Figma mockups, GitHub repository, and live staging URLs
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddDocOpen(true)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Link</span>
              </button>
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-stone-400 py-3 text-center">
                No project links or documents attached yet. Click "+ Add Link" above.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Globe className="w-4 h-4 text-stone-400 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-stone-800 dark:text-stone-200 truncate">{doc.title}</div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-emerald-600 hover:underline flex items-center gap-0.5 truncate"
                        >
                          <span className="truncate">{doc.url}</span>
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                        </a>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeProjectDocument(doc.id)}
                      className="p-1 text-stone-400 hover:text-rose-500 rounded-lg transition-colors ml-2 flex-shrink-0"
                      title="Remove link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1F. Automated Email Notifications for Web Dev */}
          <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              Automated Email Status & Delivery Handover
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-800 dark:text-stone-200 block">
                    Quotation & Agreement Email
                  </span>
                  <span className="text-[11px] text-stone-400">Sent on project kickoff</span>
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

              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-800 dark:text-stone-200 block">
                    Project Handover & Completion Email
                  </span>
                  <span className="text-[11px] text-stone-400">Dispatched on project completion</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      client.deliveryEmailStatus === 'sent'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {client.deliveryEmailStatus || 'Pending'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSendCompletionEmail}
                    disabled={emailActionLoading}
                    className="px-2 py-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg"
                  >
                    {client.deliveryEmailStatus === 'sent' ? 'Resend' : 'Send Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* SECTION 2: CONTENT MANAGEMENT WORKFLOW VIEW (Existing)         */
        /* ============================================================== */
        <div className="space-y-6">
          {/* Monthly Plan & Financial Balance Breakdown */}
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
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-rose-500 block">Remaining Due</span>
                  {remainingAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsReceiptOpen(true)}
                      className="text-[10px] font-bold text-rose-700 dark:text-rose-300 hover:underline inline-flex items-center gap-0.5"
                    >
                      <QrCode className="w-3 h-3" />
                      <span>UPI QR</span>
                    </button>
                  )}
                </div>
                <span className="text-base sm:text-lg font-bold font-mono text-rose-600 dark:text-rose-400 block mt-0.5">
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

          {/* Package Description */}
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

          {/* Content Automated Email Status */}
          <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              Automated Email Notification Status
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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

          {/* Past Monthly Periods History */}
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
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 3: SHARED PAYMENT HISTORY LEDGER                       */}
      {/* ============================================================== */}
      <div className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Payment History ({paymentHistory.length})
          </h2>
          <div className="flex items-center space-x-3">
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
                      {pay.type === 'token' ? 'Advance / Token' : 'Payment'}
                    </span>
                    <span className="text-[10px] text-stone-400 uppercase font-mono">
                      {pay.paymentMethod || 'Transfer'}
                    </span>
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

      {/* ============================================================== */}
      {/* MODALS                                                         */}
      {/* ============================================================== */}

      {/* MODAL 1: Record Payment */}
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
              placeholder="e.g. UTR / Transaction ID or milestone note"
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

      {/* MODAL 2: Start Next Month (Content Clients Only) */}
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

      {/* MODAL 3: Add Project Document / Link (Web Dev Only) */}
      <Modal
        isOpen={isAddDocOpen}
        onClose={() => setIsAddDocOpen(false)}
        title="Add Project Asset or Link"
      >
        <form onSubmit={handleSaveDocument} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Document / Asset Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Figma UI Mockup, GitHub Repo, Staging Preview"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Link Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
              >
                <option value="figma">Figma Design</option>
                <option value="github">GitHub Repository</option>
                <option value="staging">Staging Preview URL</option>
                <option value="live">Live Website</option>
                <option value="drive">Google Drive Asset</option>
                <option value="doc">Scope / SOW Document</option>
                <option value="other">Other Link</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                URL <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                required
                placeholder="https://..."
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setIsAddDocOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl"
            >
              Save Link
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Add Milestone Deliverable (Web Dev Only) */}
      <Modal
        isOpen={isAddDeliverableOpen}
        onClose={() => setIsAddDeliverableOpen(false)}
        title="Add Project Deliverable Milestone"
      >
        <form onSubmit={handleSaveDeliverable} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Milestone Deliverable Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cross-Browser QA & Mobile Layout Sign-off"
              value={newDeliverableTitle}
              onChange={(e) => setNewDeliverableTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setIsAddDeliverableOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl"
            >
              Add Deliverable
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

      {/* Printable Receipt & Invoice Modal (Content Management) */}
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

      {/* Printable Quotation Modal (Web Development) */}
      <QuotationModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
        client={client}
        quotation={quotationRecord}
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
