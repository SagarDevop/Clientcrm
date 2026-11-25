import React, { useState, useEffect } from 'react';
import { X, Calendar, RefreshCw } from 'lucide-react';
import { db } from '../../db/database.js';
import { subscriptionsRepo } from '../../db/repositories/subscriptionsRepo.js';

export function SubscriptionFormModal({ isOpen, onClose, onSaved, initialClientId = null }) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(initialClientId || '');
  const [title, setTitle] = useState('Monthly Agency Retainer');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [billingFrequency, setBillingFrequency] = useState('monthly');
  const [billingAnchorDay, setBillingAnchorDay] = useState(new Date().getDate());
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [renewalDate, setRenewalDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadClients() {
      if (!db.clients) return;
      const all = await db.clients.toArray();
      setClients(all.filter((c) => c.status !== 'archived'));
    }
    if (isOpen) {
      loadClients();
      setClientId(initialClientId || '');
      setTitle('Monthly Agency Retainer');
      setMonthlyAmount('');
      setBillingFrequency('monthly');
      setBillingAnchorDay(new Date().getDate());
      setStartDate(new Date().toISOString().slice(0, 10));
      setRenewalDate(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
      setNotes('');
      setError('');
    }
  }, [isOpen, initialClientId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) {
      setError('Please select a client');
      return;
    }
    if (!monthlyAmount || Number(monthlyAmount) <= 0) {
      setError('Please enter a valid monthly retainer amount');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const selectedClient = clients.find((c) => c.id === clientId);
      const record = await subscriptionsRepo.create({
        clientId,
        clientName: selectedClient ? selectedClient.name : '',
        title: title.trim(),
        monthlyAmount: Number(monthlyAmount),
        billingFrequency,
        billingAnchorDay: Number(billingAnchorDay),
        startDate,
        renewalDate,
        notes,
      });

      if (onSaved) onSaved(record);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Set Up Recurring Retainer</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Preserves billing anchor day without month-end drift
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Client *
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.businessName ? `(${c.businessName})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Retainer Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Monthly Content Marketing Retainer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                placeholder="0.00"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Frequency
              </label>
              <select
                value={billingFrequency}
                onChange={(e) => setBillingFrequency(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Billing Anchor Day
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={billingAnchorDay}
                onChange={(e) => setBillingAnchorDay(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
              />
              <p className="text-[10px] text-stone-400 mt-1">Preserved on 28/30-day months</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Next Renewal / Review Date
            </label>
            <input
              type="date"
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Retainer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
