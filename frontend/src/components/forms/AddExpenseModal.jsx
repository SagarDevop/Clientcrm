import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { DollarSign, Tag, Calendar, Building, FileText, CheckCircle2 } from 'lucide-react';

export function AddExpenseModal({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    description: '',
    category: 'software',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    vendor: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'software', label: 'Software & Subscriptions (SaaS, AI Tools)' },
    { value: 'hosting', label: 'Hosting & Servers (Cloud, Domains, APIs)' },
    { value: 'ads', label: 'Marketing & Ads (Meta, Google, Outreach)' },
    { value: 'contractor', label: 'Team & Freelancer Payouts' },
    { value: 'office', label: 'Office & Operations' },
    { value: 'other', label: 'Miscellaneous Business Growth' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        description: formData.description,
        category: formData.category,
        amount: Number(formData.amount),
        date: formData.date,
        vendor: formData.vendor,
      });
      setFormData({
        description: '',
        category: 'software',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        vendor: '',
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Business Expense & Cost" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            Expense Title / Description <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. ChatGPT Team Subscription, Cursor Pro, Vercel Serverless"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Expense Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:ring-2 focus:ring-emerald-500"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              step="any"
              placeholder="e.g. 2400"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Vendor / Provider Name
            </label>
            <input
              type="text"
              placeholder="e.g. OpenAI, AWS, Google Cloud, Meta"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Expense Date
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Recording...' : 'Record Expense'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
