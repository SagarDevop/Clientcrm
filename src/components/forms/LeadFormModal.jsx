import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { useLeads } from '../../hooks/useLeads.js';
import { useServices } from '../../hooks/useServices.js';
import { LEAD_STAGES } from '../../utils/formatters.js';
import { AlertCircle } from 'lucide-react';

export function LeadFormModal({ isOpen, onClose, initialData = null, onSaved }) {
  const { createLead, updateLead, checkDuplicates } = useLeads();
  const { services } = useServices();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    businessName: '',
    email: '',
    stage: 'fresh',
    serviceIds: [],
    source: '',
    estimatedValue: '',
    quotationAmount: '',
    demoStatus: 'not_sent',
    nextFollowUpAt: '',
    notes: '',
  });

  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        phone: initialData.phone || '',
        businessName: initialData.businessName || '',
        email: initialData.email || '',
        stage: initialData.stage || 'fresh',
        serviceIds: initialData.serviceIds || [],
        source: initialData.source || '',
        estimatedValue: initialData.estimatedValue || '',
        quotationAmount: initialData.quotationAmount || '',
        demoStatus: initialData.demoStatus || 'not_sent',
        nextFollowUpAt: initialData.nextFollowUpAt ? initialData.nextFollowUpAt.slice(0, 16) : '',
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        businessName: '',
        email: '',
        stage: 'fresh',
        serviceIds: [],
        source: '',
        estimatedValue: '',
        quotationAmount: '',
        demoStatus: 'not_sent',
        nextFollowUpAt: '',
        notes: '',
      });
    }
    setWarnings([]);
    setError('');
  }, [initialData, isOpen]);

  const handleCheckDuplicates = async () => {
    if (!formData.phone && !formData.email && !formData.name) return;
    const dups = await checkDuplicates({
      phone: formData.phone,
      email: formData.email,
      name: formData.name,
      excludeId: initialData?.id,
    });
    setWarnings(dups);
  };

  const toggleService = (srvId) => {
    setFormData((prev) => {
      const exists = prev.serviceIds.includes(srvId);
      return {
        ...prev,
        serviceIds: exists ? prev.serviceIds.filter((id) => id !== srvId) : [...prev.serviceIds, srvId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Lead or prospect name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        estimatedValue: Number(formData.estimatedValue) || 0,
        quotationAmount: Number(formData.quotationAmount) || 0,
        nextFollowUpAt: formData.nextFollowUpAt ? new Date(formData.nextFollowUpAt).toISOString() : null,
      };

      let saved;
      if (initialData?.id) {
        saved = await updateLead(initialData.id, payload);
      } else {
        saved = await createLead(payload);
      }

      if (onSaved) onSaved(saved);
      onClose();
    } catch (err) {
      console.error('Error saving lead:', err);
      setError(err.message || 'Failed to save lead record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Lead' : 'Add New Lead / Prospect'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs space-y-1">
            <div className="font-semibold flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Notice: Existing lead match
            </div>
            {warnings.map((w, idx) => (
              <div key={idx}>{w.message}</div>
            ))}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Lead / Contact Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            onBlur={handleCheckDuplicates}
            placeholder="e.g. Sarah Connor"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
          />
        </div>

        {/* Business Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Company / Business Name
          </label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            placeholder="e.g. Cyberdyne Ventures"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
          />
        </div>

        {/* Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              onBlur={handleCheckDuplicates}
              placeholder="+1 555-0144"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              onBlur={handleCheckDuplicates}
              placeholder="sarah@cyberdyne.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>
        </div>

        {/* Pipeline Stage & Acquisition Source */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Pipeline Stage
            </label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            >
              {LEAD_STAGES.map((stg) => (
                <option key={stg.value} value={stg.value}>
                  {stg.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Lead Source
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="Instagram, Referral, Website..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>
        </div>

        {/* Estimated Value & Quotation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Estimated Deal Value ($)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={formData.estimatedValue}
              onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
              placeholder="3000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Quotation Given ($)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={formData.quotationAmount}
              onChange={(e) => setFormData({ ...formData, quotationAmount: e.target.value })}
              placeholder="2500"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>
        </div>

        {/* Demo Status & Next Follow-up Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Demo / Pitch Status
            </label>
            <select
              value={formData.demoStatus}
              onChange={(e) => setFormData({ ...formData, demoStatus: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            >
              <option value="not_sent">Not Sent</option>
              <option value="sent">Sent to Lead</option>
              <option value="viewed">Viewed by Lead</option>
              <option value="feedback_received">Feedback Received</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Next Follow-up Due
            </label>
            <input
              type="datetime-local"
              value={formData.nextFollowUpAt}
              onChange={(e) => setFormData({ ...formData, nextFollowUpAt: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-touch-target"
            />
          </div>
        </div>

        {/* Interested Services */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Interested Services (Select all that apply)
          </label>
          <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 max-h-32 overflow-y-auto">
            {services.map((srv) => {
              const isSelected = formData.serviceIds.includes(srv.id);
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => toggleService(srv.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all min-touch-target flex items-center ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-brand-500'
                  }`}
                >
                  {srv.name}
                  {isSelected && <span className="ml-1.5 text-white">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Prospect Notes & Pain Points
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Budget, key decision maker, timeline expectations..."
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
            {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
