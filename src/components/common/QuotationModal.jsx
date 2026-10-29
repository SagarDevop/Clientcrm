import React, { useState } from 'react';
import {
  X,
  Printer,
  Share2,
  Mail,
  CheckCircle2,
  Clock,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  FileText,
  Calendar,
  Globe,
} from 'lucide-react';
import { buildUpiLink, getUpiQrCodeUrl, getSavedUpiId, getSavedUpiName } from '../../utils/upi.js';
import { generateWhatsAppLink } from '../../utils/whatsapp.js';
import { roundMoney } from '../../utils/finance.js';
import { dispatchEmail, buildWebDevOnboardingEmailHtml } from '../../utils/email.js';

export function QuotationModal({ client, quotation, isOpen, onClose }) {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);

  if (!isOpen || !client) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalCost = Number(
    quotation?.totalAmount !== undefined
      ? quotation.totalAmount
      : client.totalProjectCost || client.monthlyPlanAmount || 0
  );
  const advancePaid = Number(
    quotation?.advanceReceived !== undefined
      ? quotation.advanceReceived
      : client.tokenPaid || 0
  );
  const additionalPaid = Number(client.additionalPaid || 0);
  const totalPaid = Number(client.totalPaid || advancePaid + additionalPaid);
  const remainingBalance = Number(
    client.remainingAmount !== undefined
      ? client.remainingAmount
      : Math.max(0, totalCost - totalPaid)
  );

  const subtotal = Number(quotation?.subtotal || client.subtotal || totalCost);
  const discountAmount = Number(quotation?.discountAmount || client.discountAmount || 0);

  const isFullyPaid = remainingBalance <= 0;
  const isPartiallyPaid = !isFullyPaid && totalPaid > 0;

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const quotationNumber =
    quotation?.quotationNumber ||
    client.quotationNumber ||
    `QT-WEB-${(client.id || '0000').slice(0, 6).toUpperCase()}`;

  const projectName = quotation?.projectName || client.projectName || `${client.businessName || client.name} Web Project`;
  const projectDescription = quotation?.projectDescription || client.projectDescription || '';

  const items = quotation?.items || client.quotationItems || [
    {
      id: 'default_1',
      name: projectName,
      description: projectDescription || 'Full-Stack Web Development, UI/UX & Deployment',
      quantity: 1,
      unitPrice: totalCost,
      total: totalCost,
    },
  ];

  const startDate = quotation?.startDate || client.startDate || todayFormatted;
  const deliveryDate = quotation?.deliveryDate || client.deliveryDate || client.completionDate || 'To be scheduled';
  const paymentTerms = quotation?.paymentTerms || client.paymentTerms || '50% advance to initiate work, 50% on project delivery';

  // UPI configuration
  const upiId = getSavedUpiId();
  const upiName = getSavedUpiName();
  const upiLink = buildUpiLink({
    upiId,
    payeeName: upiName,
    amount: remainingBalance > 0 ? remainingBalance : totalCost,
    transactionNote: `Quotation ${quotationNumber} - ${client.name}`,
  });
  const upiQrUrl = getUpiQrCodeUrl(upiLink, 160);

  const handleCopyUpi = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(upiId);
      }
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch {}
  };

  // WhatsApp Share Message
  const whatsappText = `Hello ${client.name}! 🚀\n\nHere is your official Web Development Quotation from *Jugarr Agency*.\n\n📋 *Quotation Summary:*\n• Project: *${projectName}*\n• Quotation #: *${quotationNumber}*\n• Total Project Cost: *₹${totalCost.toLocaleString()}*\n• Advance Received: *₹${advancePaid.toLocaleString()}*\n• Remaining Balance: *₹${remainingBalance.toLocaleString()}*\n• Expected Delivery: *${deliveryDate}*\n\nPlease let us know if you need any adjustments or if you are ready to proceed!\n\nBest regards,\n*Jugarr Agency*`;
  const whatsappUrl = client.phone ? generateWhatsAppLink(client.phone, whatsappText) : null;

  // Send Quotation Email
  const handleSendEmail = async () => {
    if (!client.email) {
      alert('Client has no email configured.');
      return;
    }

    try {
      setIsSendingEmail(true);
      setEmailStatus(null);

      const html = buildWebDevOnboardingEmailHtml({
        client,
        project: {
          name: projectName,
          description: projectDescription,
          startDate,
          deadline: deliveryDate,
          documents: client.documents || [],
        },
        quotation: {
          quotationNumber,
          items,
          subtotal,
          discountAmount,
          totalAmount: totalCost,
          paymentTerms,
          documents: client.documents || [],
        },
        advanceAmount: advancePaid,
        remainingAmount: remainingBalance,
      });

      await dispatchEmail({
        toEmail: client.email,
        toName: client.name,
        subject: `Web Development Quotation & Project Scope: ${projectName}`,
        htmlContent: html,
      });

      setEmailStatus({ type: 'success', message: `Quotation emailed to ${client.email}` });
    } catch (err) {
      setEmailStatus({ type: 'error', message: err.message || 'Failed to dispatch email' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl print:border-none print:shadow-none print:w-full print:max-w-none print:bg-white print:text-black">
        {/* Actions Bar (Hidden on Print) */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 print:hidden gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-stone-800 dark:text-stone-200">
              Quotation #{quotationNumber}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                isFullyPaid
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : isPartiallyPaid
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {isFullyPaid ? 'Paid in Full' : isPartiallyPaid ? 'Advance Received' : 'Quotation / Unpaid'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-xl transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 rounded-xl transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {emailStatus && (
          <div
            className={`px-5 py-2 text-xs font-medium ${
              emailStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
            }`}
          >
            {emailStatus.message}
          </div>
        )}

        {/* Printable Quotation Content */}
        <div className="p-6 sm:p-8 space-y-6 text-stone-900 dark:text-stone-100 print:text-black print:p-6 print:space-y-4">
          {/* 1. Header & Agency Identity */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-800 print:border-black/20">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  J
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 print:text-black">
                    Jugarr Agency
                  </h1>
                  <p className="text-xs text-stone-500 print:text-stone-600">
                    Web Development, Custom Apps & Digital Systems
                  </p>
                </div>
              </div>
              <div className="mt-3 text-xs text-stone-500 dark:text-stone-400 print:text-stone-600 space-y-0.5">
                <div>Email: warshasingh21@gmail.com</div>
                <div>Web: jugarr.agency • Contact: Sagar (Lead Developer)</div>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg text-xs font-bold uppercase tracking-wider print:bg-stone-100 print:text-black">
                Official Quotation
              </span>
              <div className="text-sm font-bold font-mono text-stone-900 dark:text-stone-100 print:text-black mt-1">
                {quotationNumber}
              </div>
              <div className="text-xs text-stone-500 print:text-stone-600">
                Date: <strong className="text-stone-700 dark:text-stone-300 print:text-black">{todayFormatted}</strong>
              </div>
              <div className="text-xs text-stone-500 print:text-stone-600">
                Valid Till: 30 Days from Issue
              </div>
            </div>
          </div>

          {/* 2. Client & Project Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 print:bg-white print:border-stone-300 text-xs">
            <div>
              <span className="font-bold text-[10px] uppercase tracking-wider text-stone-400 block mb-1">
                Quotation Prepared For
              </span>
              <div className="font-bold text-sm text-stone-900 dark:text-stone-100 print:text-black">
                {client.name}
              </div>
              <div className="font-semibold text-stone-700 dark:text-stone-300 print:text-black">
                {client.businessName}
              </div>
              <div className="text-stone-500 dark:text-stone-400 print:text-stone-600 mt-1">
                {client.email} • {client.phone}
              </div>
            </div>

            <div>
              <span className="font-bold text-[10px] uppercase tracking-wider text-stone-400 block mb-1">
                Project Scope & Delivery Timeline
              </span>
              <div className="font-bold text-sm text-stone-900 dark:text-stone-100 print:text-black">
                {projectName}
              </div>
              {projectDescription && (
                <div className="text-stone-600 dark:text-stone-400 print:text-stone-700 mt-0.5 line-clamp-2">
                  {projectDescription}
                </div>
              )}
              <div className="mt-1 flex items-center gap-3 text-stone-500 print:text-stone-600">
                <span>Start: <strong className="text-stone-700 dark:text-stone-300 print:text-black">{startDate}</strong></span>
                <span>•</span>
                <span>Delivery: <strong className="text-stone-700 dark:text-stone-300 print:text-black">{deliveryDate}</strong></span>
              </div>
            </div>
          </div>

          {/* 3. Itemized Services Table */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Services & Scope Deliverables
            </h2>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden print:border-stone-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-stone-100 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 print:bg-stone-100 print:text-black font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Service & Scope Description</th>
                    <th className="py-2.5 px-3 w-16 text-center">Qty</th>
                    <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 print:divide-stone-200 font-sans">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/20">
                      <td className="py-2.5 px-3 text-center text-stone-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-stone-800 dark:text-stone-200 print:text-black">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 print:text-stone-600 mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-stone-600 dark:text-stone-300 print:text-black">
                        {item.quantity || 1}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone-600 dark:text-stone-300 print:text-black">
                        ₹{Number(item.unitPrice || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-stone-900 dark:text-stone-100 print:text-black">
                        ₹{Number(item.total || (item.quantity || 1) * (item.unitPrice || 0)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Financial Calculation Summary */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
            <div className="flex-1 space-y-2 text-xs">
              <span className="font-bold text-[10px] uppercase tracking-wider text-stone-400 block">
                Payment Terms & Conditions
              </span>
              <p className="text-stone-600 dark:text-stone-400 print:text-stone-700 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-stone-100 dark:border-stone-800 print:bg-white print:border-stone-200 leading-relaxed">
                {paymentTerms}
                <br />
                <span className="text-[10px] text-stone-400 block mt-1">
                  • 100% code ownership handed over upon final clearance.<br />
                  • 30-day post-launch warranty and bug-fixing included.
                </span>
              </p>
            </div>

            <div className="w-full sm:w-72 space-y-1.5 text-xs">
              <div className="flex justify-between py-1 text-stone-600 dark:text-stone-400 print:text-stone-700">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold">₹{subtotal.toLocaleString()}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400 print:text-emerald-700">
                  <span>Discount Applied:</span>
                  <span className="font-mono font-semibold">-₹{discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between py-2 border-t border-stone-200 dark:border-stone-700 print:border-black font-bold text-sm text-stone-900 dark:text-stone-100 print:text-black">
                <span>Total Project Cost:</span>
                <span className="font-mono">₹{totalCost.toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-1 text-stone-600 dark:text-stone-400 print:text-stone-700">
                <span>Advance / Token Paid:</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 print:text-emerald-700">
                  ₹{totalPaid.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between py-2 border-t border-dashed border-stone-200 dark:border-stone-700 print:border-stone-300 font-bold text-sm text-rose-600 dark:text-rose-400 print:text-rose-700">
                <span>Remaining Balance Due:</span>
                <span className="font-mono text-base">₹{remainingBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 5. UPI QR Code & Banking Payment Block */}
          {remainingBalance > 0 && (
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 print:border-stone-300 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div>
                <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-600 block mb-1">
                  Instant Payment via UPI QR Code
                </span>
                <p className="text-stone-600 dark:text-stone-400 print:text-stone-700">
                  Scan to pay using Google Pay, PhonePe, Paytm, or any UPI App
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-mono font-semibold text-stone-800 dark:text-stone-200 print:text-black">
                    UPI ID: {upiId}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="p-1 text-stone-400 hover:text-stone-600 print:hidden"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {upiQrUrl && (
                <div className="p-2 bg-white rounded-xl shadow-xs border border-stone-200 flex-shrink-0">
                  <img src={upiQrUrl} alt="UPI QR Code" className="w-28 h-28 object-contain" />
                </div>
              )}
            </div>
          )}

          {/* 6. Footer Sign-off */}
          <div className="pt-6 border-t border-stone-200 dark:border-stone-800 print:border-black/20 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 print:text-stone-600 gap-3">
            <div>
              Thank you for choosing <strong>Jugarr Agency</strong>. We look forward to building your project!
            </div>
            <div className="text-right">
              <span className="font-semibold block text-stone-700 dark:text-stone-300 print:text-black">
                Authorized Signatory
              </span>
              <span className="text-[10px] text-stone-400 print:text-stone-500">
                Jugarr Agency • BizCRM Systems
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
