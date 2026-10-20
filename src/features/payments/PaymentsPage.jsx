import React, { useState } from 'react';
import { usePayments, useFinancialSummary } from '../../hooks/usePayments.js';
import { useClients } from '../../hooks/useClients.js';
import { useProjects } from '../../hooks/useProjects.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { PaymentFormModal } from '../../components/forms/PaymentFormModal.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import {
  DollarSign,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
} from 'lucide-react';

export function PaymentsPage() {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Voiding state
  const [voidingPayment, setVoidingPayment] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  const { payments, isLoading, voidPayment } = usePayments({
    clientId: selectedClientId || undefined,
    projectId: selectedProjectId || undefined,
    status: selectedStatus || undefined,
  });

  const financialSummary = useFinancialSummary({
    clientId: selectedClientId || undefined,
    projectId: selectedProjectId || undefined,
  });

  const { clients } = useClients();
  const { projects } = useProjects();

  const getClientName = (cid) => {
    const c = clients.find((client) => client.id === cid);
    return c ? c.name : 'Unknown Client';
  };

  const getProjectName = (pid) => {
    if (!pid) return 'General Account';
    const p = projects.find((proj) => proj.id === pid);
    return p ? p.name : 'Project';
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Financial Ledger & Payments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Recorded receipts, partial deposits, refunds and ledger balances
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs sm:text-sm transition-all shadow-xs min-touch-target"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Record Transaction</span>
        </button>
      </div>

      {/* Financial Summary Ledger Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400">Total Contract Value</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(financialSummary.agreedAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Sum of agreed project terms</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400">Net Recorded Received</span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
            {formatCurrency(financialSummary.netReceived)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {financialSummary.recordedRefunds > 0 ? `After ${formatCurrency(financialSummary.recordedRefunds)} refunds` : 'Cleared funds'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400">Outstanding Receivable</span>
          <div className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">
            {formatCurrency(financialSummary.outstanding)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Pending collection</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400">Pending / In-Transit</span>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
            {formatCurrency(financialSummary.pendingAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {financialSummary.voidedAmount > 0 ? `${formatCurrency(financialSummary.voidedAmount)} voided (excluded)` : 'Awaiting clearance'}
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <select
          value={selectedClientId}
          onChange={(e) => {
            setSelectedClientId(e.target.value);
            setSelectedProjectId('');
          }}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target flex-1"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.businessName ? `(${c.businessName})` : ''}
            </option>
          ))}
        </select>

        {selectedClientId && (
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target flex-1"
          >
            <option value="">All Projects for this Client</option>
            {projects
              .filter((p) => p.clientId === selectedClientId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        )}

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target sm:w-44"
        >
          <option value="">All Statuses</option>
          <option value="recorded">Recorded / Cleared</option>
          <option value="pending">Pending Clearance</option>
          <option value="void">Voided</option>
        </select>
      </div>

      {/* Transaction Records Table / List */}
      {isLoading ? (
        <LoadingSpinner text="Loading payment ledger..." />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No transactions found"
          description="Record incoming payments, milestone retainers, and refunds to track balances."
          actionLabel="Record Payment"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {payments.map((p) => {
              const isRefund = p.type === 'refund';
              const isVoid = p.status === 'void';
              const isPending = p.status === 'pending';

              return (
                <div
                  key={p.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isVoid ? 'bg-slate-50/60 dark:bg-slate-950/40 opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-xl flex-shrink-0 ${
                        isVoid
                          ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                          : isRefund
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                      }`}
                    >
                      {isRefund ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {getClientName(p.clientId)}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                            isVoid
                              ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              : isPending
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap gap-x-2">
                        <span>{getProjectName(p.projectId)}</span>
                        <span>• Method: {p.method?.replace(/_/g, ' ')}</span>
                        {p.reference && <span>• Ref: {p.reference}</span>}
                        <span>• Date: {formatDate(p.paidAt)}</span>
                      </div>

                      {p.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                          {p.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4 pl-11 sm:pl-0">
                    <div className="text-right">
                      <div
                        className={`text-base font-bold ${
                          isVoid
                            ? 'line-through text-slate-400'
                            : isRefund
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {isRefund ? '-' : '+'}
                        {formatCurrency(p.amount)}
                      </div>
                      <span className="text-[10px] text-slate-400 capitalize">{p.type}</span>
                    </div>

                    {!isVoid && (
                      <button
                        type="button"
                        onClick={() => {
                          setVoidingPayment(p);
                          setVoidReason('');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 min-touch-target"
                        title="Void transaction"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <PaymentFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Void Transaction Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(voidingPayment)}
        onClose={() => setVoidingPayment(null)}
        onConfirm={async () => {
          if (voidingPayment) {
            await voidPayment(voidingPayment.id, voidReason);
          }
        }}
        title="Void This Transaction?"
        message={`Voiding this ${formatCurrency(voidingPayment?.amount)} transaction will exclude it from all calculated net revenue and balances. This action is permanently logged.`}
        confirmText="Void Transaction"
        isDestructive={true}
      />
    </div>
  );
}
