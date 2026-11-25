import React, { useState } from 'react';
import { X, Printer, Share2, Mail, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { generateWhatsAppLink, WHATSAPP_TEMPLATES } from '../../utils/whatsapp.js';
import { roundMoney } from '../../utils/finance.js';
import { dispatchEmail, buildInvoiceEmailHtml } from '../../utils/email.js';

export function InvoicePrintModal({ invoice, client, isOpen, onClose }) {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // { type: 'success' | 'error', message: string }

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const balanceDue = Math.max(0, roundMoney((Number(invoice.total) || 0) - (Number(invoice.paidAmount) || 0)));

  const handleSendEmail = async () => {
    const toEmail = client?.email || invoice.clientEmail;
    if (!toEmail) {
      alert('This client has no email address configured. Please add an email address in the client profile.');
      return;
    }

    try {
      setIsSendingEmail(true);
      setEmailStatus(null);

      const htmlContent = buildInvoiceEmailHtml({ invoice, client });
      await dispatchEmail({
        toEmail,
        toName: client?.name || invoice.clientName || 'Valued Client',
        subject: `Invoice #${invoice.invoiceNumber} from Jugarr Agency`,
        htmlContent,
      });

      setEmailStatus({ type: 'success', message: `Sent to ${toEmail}` });
    } catch (err) {
      setEmailStatus({ type: 'error', message: err.message || 'Failed to dispatch email' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const whatsappLink = client?.phone
    ? generateWhatsAppLink(
        client.phone,
        WHATSAPP_TEMPLATES.invoiceReminder({
          clientName: client.name,
          invoiceNumber: invoice.invoiceNumber,
          amount: balanceDue > 0 ? balanceDue : invoice.total,
          dueDate: invoice.dueDate,
        })
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl print:border-none print:shadow-none print:w-full print:max-w-none">
        {/* Actions Bar (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800 print:hidden bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-stone-800 dark:text-stone-200">
              Invoice #{invoice.invoiceNumber}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                invoice.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : invoice.status === 'overdue'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {invoice.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-xl transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Invoice</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 rounded-xl transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email Send Status Banner */}
        {emailStatus && (
          <div
            className={`px-6 py-2.5 text-xs font-medium print:hidden flex items-center justify-between ${
              emailStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-b border-rose-200 dark:border-rose-800'
            }`}
          >
            <span>
              {emailStatus.type === 'success' ? '✅ Email successfully sent via Brevo: ' : '❌ Delivery error: '}
              {emailStatus.message}
            </span>
            <button
              type="button"
              onClick={() => setEmailStatus(null)}
              className="text-[11px] underline opacity-75 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Printable Invoice Sheet */}
        <div className="p-8 space-y-8 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 print:text-black print:bg-white print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-stone-200 dark:border-stone-800 pb-6 print:border-stone-300">
            <div>
              <div className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-400 print:text-black">
                BizCRM Agency
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 print:text-stone-600 mt-1">
                Web Development & Content Marketing
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold font-mono tracking-tight">{invoice.invoiceNumber}</div>
              <p className="text-xs text-stone-500 dark:text-stone-400 print:text-stone-600 mt-1">
                Issued: {invoice.issueDate}
              </p>
              <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 print:text-stone-800">
                Due: {invoice.dueDate}
              </p>
            </div>
          </div>

          {/* Billed To */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 print:text-stone-600 mb-1">
                Billed To
              </div>
              <div className="font-bold text-stone-900 dark:text-stone-100 print:text-black">
                {invoice.clientName || client?.name || 'Valued Client'}
              </div>
              {client?.businessName && (
                <div className="text-xs text-stone-600 dark:text-stone-400 print:text-stone-700">
                  {client.businessName}
                </div>
              )}
              {client?.email && (
                <div className="text-xs text-stone-500 dark:text-stone-400 print:text-stone-700">
                  {client.email}
                </div>
              )}
              {client?.phone && (
                <div className="text-xs text-stone-500 dark:text-stone-400 print:text-stone-700 font-mono">
                  {client.phone}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 print:text-stone-600 mb-1">
                Payment Terms
              </div>
              <div className="text-xs font-medium text-stone-700 dark:text-stone-300 print:text-stone-800">
                {invoice.paymentTerms || 'Due on receipt'}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden print:border-stone-300">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/60 print:bg-stone-100 border-b border-stone-200 dark:border-stone-800 font-semibold text-stone-600 dark:text-stone-300">
                <tr>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-center w-16">Qty</th>
                  <th className="py-2.5 px-4 text-right w-28">Rate</th>
                  <th className="py-2.5 px-4 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 print:divide-stone-200">
                {(invoice.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-4 font-medium">{item.description}</td>
                    <td className="py-2.5 px-4 text-center font-mono">{item.quantity}</td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      ₹{Number(item.unitPrice || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">
                      ₹{roundMoney((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600 dark:text-stone-400 print:text-stone-700">
                <span>Subtotal:</span>
                <span className="font-mono">₹{Number(invoice.subtotal || 0).toLocaleString()}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{Number(invoice.discountAmount).toLocaleString()}</span>
                </div>
              )}
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-stone-600 dark:text-stone-400 print:text-stone-700">
                  <span>Tax ({invoice.taxRate}%):</span>
                  <span className="font-mono">+₹{Number(invoice.taxAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 print:border-stone-400 flex justify-between font-bold text-sm text-stone-900 dark:text-stone-100 print:text-black">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 print:text-black">
                  ₹{Number(invoice.total || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 print:text-stone-700">
                <span>Paid to date:</span>
                <span className="font-mono">₹{Number(invoice.paidAmount || 0).toLocaleString()}</span>
              </div>
              <div className="pt-1 border-t border-stone-100 dark:border-stone-800 flex justify-between font-bold text-xs text-stone-900 dark:text-stone-100 print:text-black">
                <span>Balance Due:</span>
                <span className="font-mono text-rose-600 dark:text-rose-400 print:text-black">
                  ₹{balanceDue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Bank Details */}
          {invoice.notes && (
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 print:bg-stone-50 border border-stone-200 dark:border-stone-800 print:border-stone-300 text-xs text-stone-600 dark:text-stone-400 print:text-stone-700">
              <div className="font-bold text-stone-700 dark:text-stone-300 print:text-stone-800 mb-1">
                Payment Instructions:
              </div>
              <p className="whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
