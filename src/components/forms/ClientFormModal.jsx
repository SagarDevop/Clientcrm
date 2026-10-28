import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { useClients } from '../../hooks/useClients.js';
import { getNextBillingDateISO } from '../../utils/dates.js';
import { roundMoney } from '../../utils/finance.js';
import { sendClientOnboardingEmails } from '../../utils/email.js';
import { AlertCircle, CheckCircle2, DollarSign, Calendar, Sparkles, Loader2 } from 'lucide-react';

export function ClientFormModal({ isOpen, onClose, initialData = null, onSaved }) {
  const { createWithPlan, updateClient, checkDuplicates } = useClients();

  const todayStr = new Date().toISOString().slice(0, 10);

  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    startDate: todayStr,
    monthlyPlanAmount: '',
    tokenPaid: '',
    packageDescription: '',
    notes: '',
    status: 'active',
  });

  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        businessName: initialData.businessName || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        startDate: initialData.startDate || todayStr,
        monthlyPlanAmount: initialData.monthlyPlanAmount || '',
        tokenPaid: initialData.tokenPaid || '',
        packageDescription: initialData.packageDescription || '',
        notes: initialData.notes || '',
        status: initialData.status || 'active',
      });
    } else {
      setFormData({
        name: '',
        businessName: '',
        email: '',
        phone: '',
        startDate: todayStr,
        monthlyPlanAmount: '',
        tokenPaid: '',
        packageDescription: '',
        notes: '',
        status: 'active',
      });
    }
    setWarnings([]);
    setError('');
  }, [initialData, isOpen]);

  // Live Calculations
  const planNum = Math.max(0, Number(formData.monthlyPlanAmount) || 0);
  const tokenNum = Math.max(0, Number(formData.tokenPaid) || 0);
  const remainingNum = Math.max(0, roundMoney(planNum - tokenNum));

  // Anchor Day & 1-Month Completion Date
  const startObj = new Date(formData.startDate || todayStr);
  const anchorDay = Math.min(31, Math.max(1, startObj.getDate() || 1));
  const completionDateStr = getNextBillingDateISO(anchorDay, formData.startDate || todayStr, 1).slice(0, 10);

  // Check potential duplicates
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Client name is required.');
      return;
    }
    if (!formData.businessName.trim()) {
      setError('Business name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (!formData.startDate) {
      setError('Service start date is required.');
      return;
    }
    if (planNum <= 0) {
      setError('Monthly plan amount must be greater than zero.');
      return;
    }
    if (tokenNum < 0) {
      setError('Token amount cannot be negative.');
      return;
    }
    if (tokenNum > planNum) {
      setError(`Token amount (₹${tokenNum}) cannot exceed agreed monthly plan amount (₹${planNum}).`);
      return;
    }
    if (!formData.packageDescription.trim()) {
      setError('Please provide service description and package details.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (initialData) {
        // Edit existing client
        const updated = await updateClient(initialData.id, {
          name: formData.name,
          businessName: formData.businessName,
          email: formData.email,
          phone: formData.phone,
          packageDescription: formData.packageDescription,
          notes: formData.notes,
          status: formData.status,
        });
        if (onSaved) onSaved(updated);
        onClose();
      } else {
        // Create new client with 1-month plan
        const newClient = await createWithPlan({
          name: formData.name,
          businessName: formData.businessName,
          email: formData.email,
          phone: formData.phone,
          startDate: formData.startDate,
          completionDate: completionDateStr,
          billingAnchorDay: anchorDay,
          monthlyPlanAmount: planNum,
          tokenPaid: tokenNum,
          packageDescription: formData.packageDescription,
          notes: formData.notes,
          status: 'active',
        });

        // Step 4: Dispatch Onboarding Email (after client is safely saved)
        try {
          await sendClientOnboardingEmails({
            client: newClient,
            tokenAmount: tokenNum,
            remainingAmount: remainingNum,
          });
        } catch (emailErr) {
          console.warn('Onboarding email dispatch notice:', emailErr);
        }

        if (onSaved) onSaved(newClient);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to save client.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Client Details' : 'Add New Client & Monthly Plan'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-2 text-rose-800 dark:text-rose-200 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
            {warnings.map((w, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-amber-800 dark:text-amber-200 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* 1. Client & Business Identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Client Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Verma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onBlur={handleCheckDuplicates}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Business Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Verma Retail & Co."
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* 2. Contact Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="client@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              onBlur={handleCheckDuplicates}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-stone-400">Onboarding & completion emails will be sent here</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Phone / WhatsApp Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              onBlur={handleCheckDuplicates}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* 3. Monthly Plan & Financials */}
        {!initialData && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-stone-100 dark:border-stone-800">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Service Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Monthly Plan Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="10000"
                  value={formData.monthlyPlanAmount}
                  onChange={(e) => setFormData({ ...formData, monthlyPlanAmount: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Token / Advance Received (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={planNum || undefined}
                  step="any"
                  placeholder="0"
                  value={formData.tokenPaid}
                  onChange={(e) => setFormData({ ...formData, tokenPaid: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Clear Calculation Breakdown Preview */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Plan & Payment Calculation
                </span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Anchor Day: {anchorDay}th
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-stone-400 block">Agreed Plan:</span>
                  <span className="font-mono font-bold text-stone-800 dark:text-stone-100 text-sm">
                    ₹{planNum.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block">Token Received:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                    ₹{tokenNum.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block">Remaining Due:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                    ₹{remainingNum.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block">1-Month Completion:</span>
                  <span className="font-mono font-medium text-stone-700 dark:text-stone-300 text-sm">
                    {completionDateStr}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 4. Service Description & Package Details */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            Service Description & Package Details <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            placeholder="Write what is included in their monthly package (e.g. 15 Instagram Reels, daily stories, website maintenance, ad campaign setup)... Line breaks and paragraphs will be preserved in the onboarding email."
            value={formData.packageDescription}
            onChange={(e) => setFormData({ ...formData, packageDescription: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
          />
          <span className="text-[10px] text-stone-400">
            This paragraph will be directly included in the client's Welcome Onboard email.
          </span>
        </div>

        {/* 5. Additional Notes (Optional) */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            Internal Notes (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Private notes for yourself..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center space-x-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving & Dispatching Email...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{initialData ? 'Update Client' : 'Save Client & Send Onboarding Email'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
