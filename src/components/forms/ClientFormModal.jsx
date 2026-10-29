import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { useClients } from '../../hooks/useClients.js';
import { getNextBillingDateISO } from '../../utils/dates.js';
import { roundMoney } from '../../utils/finance.js';
import { sendClientOnboardingEmails, sendWebDevOnboardingEmails } from '../../utils/email.js';
import { PackageBuilder } from './PackageBuilder.jsx';
import { QuotationBuilder } from './QuotationBuilder.jsx';
import { calculateQuotationTotals } from '../../db/repositories/quotationsRepo.js';
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Calendar,
  Sparkles,
  Loader2,
  Layers,
  Code,
  Globe,
  FileText,
  Plus,
  Trash2,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';

export function ClientFormModal({ isOpen, onClose, initialData = null, onSaved }) {
  const { createWithPlan, createWebDevClient, updateClient, checkDuplicates } = useClients();

  const todayStr = new Date().toISOString().slice(0, 10);
  const threeWeeksLaterStr = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);

  // 1. Client Type: 'content_management' | 'web_development'
  const [clientType, setClientType] = useState('content_management');

  // Shared Client & Business Identity
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    notes: '',
    status: 'active',
  });

  // Content Management specific fields
  const [contentData, setContentData] = useState({
    startDate: todayStr,
    monthlyPlanAmount: '',
    tokenPaid: '',
    packageDescription: '',
  });

  // Web Development specific fields
  const [webDevData, setWebDevData] = useState({
    projectName: '',
    projectDescription: '',
    startDate: todayStr,
    deliveryDate: threeWeeksLaterStr,
    items: [
      {
        id: 'item_1',
        name: 'Custom Responsive Website Development',
        description: '5-page mobile-friendly layout, clean UI/UX components, and production deployment',
        quantity: 1,
        unitPrice: 25000,
        total: 25000,
      },
    ],
    discount: { type: 'none', value: 0 },
    tokenPaid: '10000',
    paymentTerms: '50% advance to initiate work, 50% on project delivery',
    documents: [],
  });

  // Document draft inside modal
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('figma');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [showDocForm, setShowDocForm] = useState(false);

  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      const isWeb = initialData.clientType === 'web_development' || initialData.category === 'web_dev';
      setClientType(isWeb ? 'web_development' : 'content_management');
      setFormData({
        name: initialData.name || '',
        businessName: initialData.businessName || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        notes: initialData.notes || '',
        status: initialData.status || 'active',
      });

      if (isWeb) {
        setWebDevData({
          projectName: initialData.projectName || '',
          projectDescription: initialData.projectDescription || '',
          startDate: initialData.startDate || todayStr,
          deliveryDate: initialData.deliveryDate || initialData.completionDate || threeWeeksLaterStr,
          items: Array.isArray(initialData.quotationItems) && initialData.quotationItems.length > 0
            ? initialData.quotationItems
            : [
                {
                  id: 'item_1',
                  name: initialData.projectName || 'Web Development Project',
                  description: initialData.projectDescription || '',
                  quantity: 1,
                  unitPrice: initialData.totalProjectCost || 25000,
                  total: initialData.totalProjectCost || 25000,
                },
              ],
          discount: {
            type: initialData.discountType || 'none',
            value: initialData.discountValue || 0,
          },
          tokenPaid: String(initialData.tokenPaid || initialData.advancePaid || 0),
          paymentTerms: initialData.paymentTerms || '50% advance, 50% on project delivery',
          documents: Array.isArray(initialData.documents) ? initialData.documents : [],
        });
      } else {
        setContentData({
          startDate: initialData.startDate || todayStr,
          monthlyPlanAmount: initialData.monthlyPlanAmount || '',
          tokenPaid: initialData.tokenPaid || '',
          packageDescription: initialData.packageDescription || '',
        });
      }
    } else {
      setClientType('content_management');
      setFormData({
        name: '',
        businessName: '',
        email: '',
        phone: '',
        notes: '',
        status: 'active',
      });
      setContentData({
        startDate: todayStr,
        monthlyPlanAmount: '',
        tokenPaid: '',
        packageDescription: '',
      });
      setWebDevData({
        projectName: '',
        projectDescription: '',
        startDate: todayStr,
        deliveryDate: threeWeeksLaterStr,
        items: [
          {
            id: 'item_1',
            name: 'Custom Responsive Website Development',
            description: '5-page mobile-friendly layout, clean UI/UX components, and production deployment',
            quantity: 1,
            unitPrice: 25000,
            total: 25000,
          },
        ],
        discount: { type: 'none', value: 0 },
        tokenPaid: '10000',
        paymentTerms: '50% advance to initiate work, 50% on project delivery',
        documents: [],
      });
    }
    setWarnings([]);
    setError('');
  }, [initialData, isOpen, todayStr, threeWeeksLaterStr]);

  // Content Plan Live Calculations
  const planNum = Math.max(0, Number(contentData.monthlyPlanAmount) || 0);
  const tokenNum = Math.max(0, Number(contentData.tokenPaid) || 0);
  const remainingNum = Math.max(0, roundMoney(planNum - tokenNum));

  // Anchor Day & 1-Month Completion Date
  const startObj = new Date(contentData.startDate || todayStr);
  const anchorDay = Math.min(31, Math.max(1, startObj.getDate() || 1));
  const completionDateStr = getNextBillingDateISO(anchorDay, contentData.startDate || todayStr, 1).slice(0, 10);

  // Web Dev Live Calculations
  const webTotals = calculateQuotationTotals(webDevData.items, webDevData.discount);
  const webTokenNum = Math.max(0, Number(webDevData.tokenPaid) || 0);
  const webRemainingNum = Math.max(0, roundMoney(webTotals.totalAmount - webTokenNum));

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

  // Add document link
  const handleAddDocument = () => {
    if (!newDocUrl.trim()) return;
    const newDoc = {
      id: `doc_${Date.now()}`,
      title: newDocTitle.trim() || 'Project Asset',
      type: newDocType,
      url: newDocUrl.trim(),
      addedAt: new Date().toISOString(),
    };
    setWebDevData((prev) => ({ ...prev, documents: [...prev.documents, newDoc] }));
    setNewDocTitle('');
    setNewDocUrl('');
    setShowDocForm(false);
  };

  const handleRemoveDocument = (docId) => {
    setWebDevData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== docId),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Shared Validations
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

    try {
      setIsSubmitting(true);

      if (initialData) {
        // Edit existing client
        const updates = {
          name: formData.name,
          businessName: formData.businessName,
          email: formData.email,
          phone: formData.phone,
          notes: formData.notes,
          status: formData.status,
        };

        if (clientType === 'content_management') {
          updates.packageDescription = contentData.packageDescription;
        } else {
          updates.projectName = webDevData.projectName || `${formData.businessName} Website`;
          updates.projectDescription = webDevData.projectDescription;
          updates.deliveryDate = webDevData.deliveryDate;
          updates.completionDate = webDevData.deliveryDate;
          updates.documents = webDevData.documents;
        }

        const updated = await updateClient(initialData.id, updates);
        if (onSaved) onSaved(updated);
        onClose();
        return;
      }

      // New Client Creation based on Client Type
      if (clientType === 'content_management') {
        // --- Content Management Validation ---
        if (!contentData.startDate) {
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
        if (!contentData.packageDescription.trim()) {
          setError('Please provide service description and package details.');
          return;
        }

        const newClient = await createWithPlan({
          name: formData.name,
          businessName: formData.businessName,
          email: formData.email,
          phone: formData.phone,
          startDate: contentData.startDate,
          completionDate: completionDateStr,
          billingAnchorDay: anchorDay,
          monthlyPlanAmount: planNum,
          tokenPaid: tokenNum,
          packageDescription: contentData.packageDescription,
          notes: formData.notes,
          status: 'active',
        });

        // Dispatch Content Onboarding Email
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
      } else {
        // --- Web Development Validation ---
        const pName = webDevData.projectName.trim() || `${formData.businessName} Website`;
        if (webTotals.totalAmount <= 0) {
          setError('Total project cost must be greater than zero.');
          return;
        }
        if (webTokenNum < 0) {
          setError('Advance token amount cannot be negative.');
          return;
        }
        if (webTokenNum > webTotals.totalAmount) {
          setError(
            `Advance amount (₹${webTokenNum.toLocaleString()}) cannot exceed total project cost (₹${webTotals.totalAmount.toLocaleString()}).`
          );
          return;
        }
        if (webDevData.deliveryDate && webDevData.startDate && webDevData.deliveryDate < webDevData.startDate) {
          setError('Expected delivery date cannot be earlier than project start date.');
          return;
        }

        const result = await createWebDevClient({
          name: formData.name,
          businessName: formData.businessName,
          email: formData.email,
          phone: formData.phone,
          projectName: pName,
          projectDescription: webDevData.projectDescription,
          startDate: webDevData.startDate,
          deliveryDate: webDevData.deliveryDate,
          items: webDevData.items,
          discountType: webDevData.discount.type,
          discountValue: webDevData.discount.value,
          totalProjectCost: webTotals.totalAmount,
          tokenPaid: webTokenNum,
          paymentTerms: webDevData.paymentTerms,
          documents: webDevData.documents,
          notes: formData.notes,
          status: 'active',
        });

        // Dispatch Web Development Project Onboarding Email
        try {
          await sendWebDevOnboardingEmails({
            client: result.client,
            project: result.project,
            quotation: result.quotation,
            advanceAmount: webTokenNum,
            remainingAmount: webRemainingNum,
          });
        } catch (emailErr) {
          console.warn('Web dev onboarding email notice:', emailErr);
        }

        if (onSaved) onSaved(result.client);
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
      title={
        initialData
          ? 'Edit Client Details'
          : clientType === 'web_development'
          ? 'Add Web Development Client & Project'
          : 'Add Content Management Client & Plan'
      }
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

        {/* 0. Client Type Selection (Content Management vs. Web Development) */}
        {!initialData && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Select Client Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setClientType('content_management')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  clientType === 'content_management'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400'
                }`}
              >
                <div
                  className={`p-2 rounded-xl flex-shrink-0 ${
                    clientType === 'content_management'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">Content Management</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 leading-tight">
                    Monthly recurring retainer & social media content production
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setClientType('web_development')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  clientType === 'web_development'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400'
                }`}
              >
                <div
                  className={`p-2 rounded-xl flex-shrink-0 ${
                    clientType === 'web_development'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                  }`}
                >
                  <Code className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">Web Development</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 leading-tight">
                    Project-based milestone delivery, quotation & advance tracking
                  </div>
                </div>
              </button>
            </div>
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
            <span className="text-[10px] text-stone-400">
              {clientType === 'web_development'
                ? 'Official quotation PDF & project agreements will be emailed here'
                : 'Onboarding & monthly completion emails will be sent here'}
            </span>
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

        {/* ============================================================== */}
        {/* WORKFLOW A: CONTENT MANAGEMENT (Monthly Retainer)              */}
        {/* ============================================================== */}
        {clientType === 'content_management' && (
          <>
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
                      value={contentData.startDate}
                      onChange={(e) => setContentData({ ...contentData, startDate: e.target.value })}
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
                      value={contentData.monthlyPlanAmount}
                      onChange={(e) => setContentData({ ...contentData, monthlyPlanAmount: e.target.value })}
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
                      value={contentData.tokenPaid}
                      onChange={(e) => setContentData({ ...contentData, tokenPaid: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Calculation Breakdown Preview */}
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

            {/* Package Deliverables Builder */}
            <PackageBuilder
              value={contentData.packageDescription}
              onChange={(newVal) => setContentData((prev) => ({ ...prev, packageDescription: newVal }))}
            />
          </>
        )}

        {/* ============================================================== */}
        {/* WORKFLOW B: WEB DEVELOPMENT (Project-Based & Quotation)        */}
        {/* ============================================================== */}
        {clientType === 'web_development' && (
          <div className="space-y-4 pt-2 border-t border-stone-100 dark:border-stone-800">
            {/* Project Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verma Retail Custom E-Commerce Store"
                  value={webDevData.projectName}
                  onChange={(e) => setWebDevData({ ...webDevData, projectName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Project Scope Summary
                </label>
                <input
                  type="text"
                  placeholder="e.g. Custom Next.js storefront, Razorpay checkout & admin dashboard"
                  value={webDevData.projectDescription}
                  onChange={(e) => setWebDevData({ ...webDevData, projectDescription: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Project Timeline Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Project Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={webDevData.startDate}
                  onChange={(e) => setWebDevData({ ...webDevData, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Expected Delivery Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={webDevData.startDate || undefined}
                  value={webDevData.deliveryDate}
                  onChange={(e) => setWebDevData({ ...webDevData, deliveryDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Dynamic Quotation Builder */}
            {!initialData && (
              <>
                <QuotationBuilder
                  items={webDevData.items}
                  onChangeItems={(newItems) => setWebDevData((prev) => ({ ...prev, items: newItems }))}
                  discount={webDevData.discount}
                  onChangeDiscount={(newDisc) => setWebDevData((prev) => ({ ...prev, discount: newDisc }))}
                  tokenPaid={webDevData.tokenPaid}
                  onChangeTokenPaid={(val) => setWebDevData((prev) => ({ ...prev, tokenPaid: val }))}
                />

                {/* Payment Terms */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Agreed Payment Terms
                  </label>
                  <select
                    value={webDevData.paymentTerms}
                    onChange={(e) => setWebDevData({ ...webDevData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="50% advance to initiate work, 50% on project delivery">
                      50% advance to initiate work, 50% on project delivery
                    </option>
                    <option value="30% token advance, 40% milestone completion, 30% on handover">
                      30% token advance, 40% milestone completion, 30% on handover
                    </option>
                    <option value="100% upfront payment upon agreement">100% upfront payment upon agreement</option>
                    <option value="Net 15 days upon milestone verification">Net 15 days upon milestone verification</option>
                  </select>
                </div>
              </>
            )}

            {/* Relevant Project Documents & Links */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-stone-400" />
                  <span>Project Documents & Links (Optional)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowDocForm(!showDocForm)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                >
                  {showDocForm ? 'Cancel' : '+ Add Document/Link'}
                </button>
              </div>

              {/* Add document form */}
              {showDocForm && (
                <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Title (e.g. Figma UI Mockup)"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
                    />
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
                    >
                      <option value="figma">Figma Mockup</option>
                      <option value="github">GitHub Repo</option>
                      <option value="staging">Staging Preview URL</option>
                      <option value="live">Live Website</option>
                      <option value="drive">Google Drive Asset</option>
                      <option value="doc">Scope of Work Doc</option>
                    </select>
                    <input
                      type="url"
                      placeholder="URL (https://...)"
                      value={newDocUrl}
                      onChange={(e) => setNewDocUrl(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddDocument}
                      className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg"
                    >
                      Add Link
                    </button>
                  </div>
                </div>
              )}

              {/* Added Documents List */}
              {webDevData.documents.length > 0 && (
                <div className="space-y-1.5">
                  {webDevData.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">{doc.title}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-sm bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                          {doc.type}
                        </span>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-emerald-600 hover:underline truncate max-w-[200px]"
                        >
                          {doc.url}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="text-stone-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Additional Internal Notes (Optional) */}
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
                <span>
                  {initialData
                    ? 'Update Client'
                    : clientType === 'web_development'
                    ? 'Save Web Client & Email Quotation'
                    : 'Save Client & Send Onboarding Email'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
