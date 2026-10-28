import React from 'react';
import { X, Printer, Share2, CheckCircle2, Clock } from 'lucide-react';

export function ClientReceiptModal({ client, payments = [], isOpen, onClose, onOpenWhatsApp }) {
  if (!isOpen || !client) return null;

  const handlePrint = () => {
    window.print();
  };

  const planAmount = Number(client.monthlyPlanAmount || 0);
  const tokenPaid = Number(client.tokenPaid || 0);
  const additionalPaid = Number(client.additionalPaid || 0);
  const totalPaid = Number(client.totalPaid || tokenPaid + additionalPaid);
  const remainingAmount = Number(
    client.remainingAmount !== undefined ? client.remainingAmount : Math.max(0, planAmount - totalPaid)
  );

  const isFullyPaid = remainingAmount <= 0;
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const receiptNumber = `RCP-${(client.id || '0000').slice(0, 6).toUpperCase()}-${(client.startDate || '').replace(/-/g, '')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl print:border-none print:shadow-none print:w-full print:max-w-none print:bg-white print:text-black">
        {/* Actions Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-stone-800 dark:text-stone-200">
              Receipt / Invoice #{receiptNumber}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                isFullyPaid
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {isFullyPaid ? 'Paid in Full' : 'Partial / Balance Due'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenWhatsApp && (
              <button
                type="button"
                onClick={onOpenWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-xl transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}

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

        {/* Printable Receipt Body */}
        <div className="p-8 sm:p-10 space-y-6 text-stone-900 dark:text-stone-100 print:text-black print:p-8 font-sans">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-stone-200 dark:border-stone-800 print:border-stone-300 pb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-emerald-600 print:text-emerald-700">
                Jugarr Agency
              </h1>
              <p className="text-xs text-stone-500 print:text-stone-600 mt-1">
                Client Management & Digital Growth Services
              </p>
              <p className="text-xs text-stone-500 print:text-stone-600">
                Contact: warshasingh21@gmail.com
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono font-bold text-stone-400 uppercase tracking-widest">
                Payment Receipt
              </div>
              <div className="text-base font-bold font-mono text-stone-800 dark:text-stone-200 print:text-black mt-0.5">
                #{receiptNumber}
              </div>
              <div className="text-xs text-stone-500 print:text-stone-600 mt-1">
                Date: <strong>{todayFormatted}</strong>
              </div>
            </div>
          </div>

          {/* Billed To & Service Period */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-stone-400 uppercase tracking-wider block text-[10px]">
                Billed To:
              </span>
              <div className="font-bold text-sm text-stone-900 dark:text-stone-100 print:text-black">
                {client.name}
              </div>
              <div className="font-semibold text-stone-700 dark:text-stone-300 print:text-stone-800">
                {client.businessName}
              </div>
              {client.email && (
                <div className="text-stone-500 print:text-stone-600">{client.email}</div>
              )}
              {client.phone && (
                <div className="text-stone-500 print:text-stone-600 font-mono">{client.phone}</div>
              )}
            </div>

            <div className="space-y-1 text-right">
              <span className="font-bold text-stone-400 uppercase tracking-wider block text-[10px]">
                Service Period:
              </span>
              <div className="font-bold text-sm text-stone-900 dark:text-stone-100 print:text-black">
                1-Month Service Plan
              </div>
              <div className="text-stone-600 dark:text-stone-400 print:text-stone-700">
                Start: <strong>{client.startDate || 'N/A'}</strong>
              </div>
              <div className="text-stone-600 dark:text-stone-400 print:text-stone-700">
                Completion: <strong>{client.completionDate || 'N/A'}</strong>
              </div>
            </div>
          </div>

          {/* Package Description Box */}
          {client.packageDescription && (
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 print:bg-stone-50 border border-stone-100 dark:border-stone-800 print:border-stone-200 text-xs">
              <span className="font-bold text-[10px] text-stone-400 uppercase tracking-wider block mb-1">
                Package Inclusions & Deliverables:
              </span>
              <p className="whitespace-pre-line text-stone-700 dark:text-stone-300 print:text-stone-800 leading-relaxed">
                {client.packageDescription}
              </p>
            </div>
          )}

          {/* Financial Breakdown Table */}
          <div className="border border-stone-200 dark:border-stone-800 print:border-stone-300 rounded-2xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-800/60 print:bg-stone-100 border-b border-stone-200 dark:border-stone-800 print:border-stone-300">
                  <th className="py-2.5 px-4 font-bold text-stone-600 dark:text-stone-300 print:text-stone-800">
                    Description
                  </th>
                  <th className="py-2.5 px-4 font-bold text-right text-stone-600 dark:text-stone-300 print:text-stone-800">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 print:divide-stone-200">
                <tr>
                  <td className="py-3 px-4 font-medium">
                    <div>Monthly Retainer Service Plan</div>
                    <div className="text-[11px] text-stone-400 print:text-stone-500">
                      Anchor Period: {client.startDate} &rarr; {client.completionDate}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 dark:text-stone-100 print:text-black">
                    ₹{planAmount.toLocaleString()}
                  </td>
                </tr>

                {tokenPaid > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 text-stone-600 dark:text-stone-400 print:text-stone-600">
                      Token Payment Received (Onboarding)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 print:text-emerald-700 font-semibold">
                      - ₹{tokenPaid.toLocaleString()}
                    </td>
                  </tr>
                )}

                {payments && payments.length > 0 && payments.map((pmt, idx) => (
                  <tr key={pmt.id || idx}>
                    <td className="py-2.5 px-4 text-stone-600 dark:text-stone-400 print:text-stone-600">
                      Payment Received ({pmt.paidAt || 'Recorded'} via {pmt.paymentMethod || 'Transfer'})
                      {pmt.notes && <span className="text-[11px] block italic text-stone-400">{pmt.notes}</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 print:text-emerald-700 font-semibold">
                      - ₹{Number(pmt.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone-200 dark:border-stone-800 print:border-stone-300 bg-stone-50/50 dark:bg-stone-800/30 print:bg-stone-50">
                  <td className="py-2.5 px-4 font-bold text-stone-700 dark:text-stone-300 print:text-stone-800">
                    Total Amount Received
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-700 text-sm">
                    ₹{totalPaid.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-t-2 border-stone-900 dark:border-stone-100 print:border-black bg-stone-50 dark:bg-stone-800/60 print:bg-stone-100">
                  <td className="py-3 px-4 font-extrabold text-sm text-stone-900 dark:text-stone-100 print:text-black">
                    Remaining Balance Due
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-mono font-black text-base ${
                      isFullyPaid
                        ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-700'
                        : 'text-rose-600 dark:text-rose-400 print:text-rose-700'
                    }`}
                  >
                    ₹{remainingAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Status Stamp */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-stone-500 print:text-stone-600 max-w-sm">
              Thank you for choosing Jugarr Agency. For renewal inquiries or billing clarifications, please reach out directly at warshasingh21@gmail.com.
            </div>

            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                  isFullyPaid
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 print:border-emerald-700 print:text-emerald-700'
                    : 'border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 print:border-amber-600 print:text-amber-700'
                }`}
              >
                {isFullyPaid ? '✔ Fully Settled' : '⏳ Balance Outstanding'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
