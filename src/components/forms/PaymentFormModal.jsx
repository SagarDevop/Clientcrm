import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { usePayments } from '../../hooks/usePayments.js';
import { useClients } from '../../hooks/useClients.js';
import { useProjects } from '../../hooks/useProjects.js';
import { AlertCircle } from 'lucide-react';

export function PaymentFormModal({
  isOpen,
  onClose,
  initialData = null,
  defaultClientId = null,
  defaultProjectId = null,
  onSaved,
}) {
  const { recordPayment, updatePayment } = usePayments();
  const { clients } = useClients({ status: 'active' });
  const { projects } = useProjects();

  const [formData, setFormData] = useState({
    clientId: defaultClientId || '',
    projectId: defaultProjectId || '',
    type: 'payment',
    amount: '',
    paidAt: '',
    method: 'bank_transfer',
    status: 'recorded',
    reference: '',
    notes: '',
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        clientId: initialData.clientId || '',
        projectId: initialData.projectId || '',
        type: initialData.type || 'payment',
        amount: initialData.amount || '',
        paidAt: initialData.paidAt ? initialData.paidAt.slice(0, 10) : '',
        method: initialData.method || 'bank_transfer',
        status: initialData.status || 'recorded',
        reference: initialData.reference || '',
        notes: initialData.notes || '',
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setFormData({
        clientId: defaultClientId || (clients[0]?.id || ''),
        projectId: defaultProjectId || '',
        type: 'payment',
        amount: '',
        paidAt: today,
        method: 'bank_transfer',
        status: 'recorded',
        reference: '',
        notes: '',
      });
    }
    setError('');
  }, [initialData, defaultClientId, defaultProjectId, isOpen, clients]);

  const clientProjects = formData.clientId
    ? projects.filter((p) => p.clientId === formData.clientId)
    : projects;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.clientId) {
      setError('Please select a client for this transaction.');
      return;
    }

    const amt = Number(formData.amount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        amount: amt,
        paidAt: formData.paidAt ? new Date(formData.paidAt).toISOString() : new Date().toISOString(),
        projectId: formData.projectId || null,
      };

      let saved;
      if (initialData?.id) {
        saved = await updatePayment(initialData.id, payload);
      } else {
        saved = await recordPayment(payload);
      }

      if (onSaved) onSaved(saved);
      onClose();
    } catch (err) {
      console.error('Error saving payment:', err);
      setError(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Transaction' : 'Record Payment / Transaction'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Client Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Client *
          </label>
          <select
            required
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value, projectId: '' })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.businessName ? `(${c.businessName})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Linked Project */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Linked Project (Optional)
          </label>
          <select
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
          >
            <option value="">General Client Account (No specific project)</option>
            {clientProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Transaction Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            >
              <option value="payment">Payment Received (+)</option>
              <option value="refund">Refund Issued (-)</option>
              <option value="adjustment">Adjustment (+/-)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Amount ($) *
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="1500"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>
        </div>

        {/* Date & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={formData.paidAt}
              onChange={(e) => setFormData({ ...formData, paidAt: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Payment Method
            </label>
            <select
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            >
              <option value="bank_transfer">Bank Transfer / Wire</option>
              <option value="upi">UPI / Instant Pay</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Status & Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            >
              <option value="recorded">Recorded / Cleared</option>
              <option value="pending">Pending Clearance</option>
              <option value="void">Void</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Reference / Invoice #
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="INV-0042 / UTR# 94827"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Transaction Notes
          </label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Partial deposit for milestone 1..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-touch-target"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm min-touch-target"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Record Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
