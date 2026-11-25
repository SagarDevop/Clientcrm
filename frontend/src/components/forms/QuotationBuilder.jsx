import React, { useState } from 'react';
import { Plus, Trash2, Tag, Percent, DollarSign, Sparkles, Check } from 'lucide-react';
import { roundMoney } from '../../utils/finance.js';
import { calculateQuotationTotals } from '../../db/repositories/quotationsRepo.js';

export const POPULAR_WEB_SERVICES = [
  {
    name: 'Custom Responsive Website Development',
    description: '5-page mobile-friendly modern website with smooth animations & SEO meta tags',
    unitPrice: 25000,
  },
  {
    name: 'E-Commerce Online Store Setup',
    description: 'Product catalog, shopping cart, UPI/Razorpay payment gateway, and order notifications',
    unitPrice: 35000,
  },
  {
    name: 'Full-Stack Web App & Client Portal',
    description: 'Secure authentication, database schema, real-time dashboard, and admin role control',
    unitPrice: 50000,
  },
  {
    name: 'UI/UX Design & Figma Prototype',
    description: 'Complete user flow, wireframes, modern component library, and interactive Figma mockup',
    unitPrice: 15000,
  },
  {
    name: 'REST API & Third-Party Integration',
    description: 'Custom RESTful backend APIs, webhook integrations, and database optimization',
    unitPrice: 20000,
  },
  {
    name: 'SEO, Speed & Core Web Vitals Optimization',
    description: 'Page speed boost, 90+ Lighthouse score, sitemap submission, and Google Search Console setup',
    unitPrice: 8000,
  },
  {
    name: 'Domain, SSL & Cloud Deployment',
    description: 'Production VPS / Vercel cloud deployment, automated SSL certificates, and custom domain setup',
    unitPrice: 5000,
  },
];

export function QuotationBuilder({
  items = [],
  onChangeItems,
  discount = { type: 'none', value: 0 },
  onChangeDiscount,
  tokenPaid = '',
  onChangeTokenPaid,
}) {
  const [showPresets, setShowPresets] = useState(false);

  // Line item handlers
  const handleUpdateItem = (id, field, value) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const next = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = Math.max(1, Number(field === 'quantity' ? value : next.quantity) || 1);
          const price = Math.max(0, Number(field === 'unitPrice' ? value : next.unitPrice) || 0);
          next.total = roundMoney(qty * price);
        }
        return next;
      }
      return item;
    });
    onChangeItems(updated);
  };

  const handleAddItem = (preset = null) => {
    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: preset?.name || '',
      description: preset?.description || '',
      quantity: 1,
      unitPrice: preset?.unitPrice || 10000,
      total: preset?.unitPrice || 10000,
    };
    onChangeItems([...items, newItem]);
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 1) {
      alert('Quotation must contain at least one service item.');
      return;
    }
    onChangeItems(items.filter((item) => item.id !== id));
  };

  // Calculations
  const totals = calculateQuotationTotals(items, discount);
  const tokenNum = Math.max(0, Number(tokenPaid) || 0);
  const remainingNum = Math.max(0, roundMoney(totals.totalAmount - tokenNum));

  return (
    <div className="space-y-4">
      {/* Header and Quick Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            Dynamic Quotation & Scope Builder
          </span>
          <p className="text-[11px] text-stone-400">
            Specify services, customize rates, and apply project discounts
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-xl transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{showPresets ? 'Hide Presets' : 'Add From Web Presets'}</span>
        </button>
      </div>

      {/* Presets Quick Picker Dropdown */}
      {showPresets && (
        <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Click to add popular web development deliverables:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {POPULAR_WEB_SERVICES.map((srv, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  handleAddItem(srv);
                  setShowPresets(false);
                }}
                className="text-left p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-emerald-500 transition-all group flex items-start justify-between gap-2"
              >
                <div>
                  <div className="font-semibold text-xs text-stone-800 dark:text-stone-100 group-hover:text-emerald-600">
                    {srv.name}
                  </div>
                  <div className="text-[10px] text-stone-400 line-clamp-1">{srv.description}</div>
                </div>
                <span className="font-mono font-bold text-xs text-emerald-600 flex-shrink-0">
                  +₹{srv.unitPrice.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Line Items List */}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2.5 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 text-[10px] font-bold text-stone-500 flex items-center justify-center flex-shrink-0 mt-1">
                {idx + 1}
              </span>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* Service Name */}
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    required
                    placeholder="Service Name (e.g. Landing Page Design)"
                    value={item.name}
                    onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Qty */}
                <div className="sm:col-span-2">
                  <div className="flex items-center">
                    <span className="text-[11px] text-stone-400 mr-1 sm:hidden">Qty:</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs text-center font-mono rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Unit Price */}
                <div className="sm:col-span-2">
                  <div className="flex items-center">
                    <span className="text-[11px] text-stone-400 mr-1 sm:hidden">Price (₹):</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="₹ Rate"
                      value={item.unitPrice}
                      onChange={(e) => handleUpdateItem(item.id, 'unitPrice', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs text-right font-mono font-semibold rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Line Total */}
                <div className="sm:col-span-2 flex items-center justify-end">
                  <span className="text-xs font-mono font-bold text-stone-900 dark:text-stone-100">
                    ₹{roundMoney(item.total || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Delete Button */}
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex-shrink-0"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scope / Description details */}
            <input
              type="text"
              placeholder="Scope details (e.g., Responsive layout, Figma to Next.js, SEO tags)"
              value={item.description}
              onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
              className="w-full px-3 py-1 text-[11px] text-stone-600 dark:text-stone-400 rounded-lg border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        ))}

        <button
          type="button"
          onClick={() => handleAddItem()}
          className="w-full py-2 border border-dashed border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Service Line Item</span>
        </button>
      </div>

      {/* Discount & Advance Payment Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
        {/* Discount Selector */}
        <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-2">
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
            <Tag className="w-3 h-3 text-stone-400" />
            <span>Project Discount</span>
          </label>
          <div className="flex gap-2">
            <select
              value={discount.type}
              onChange={(e) => onChangeDiscount({ ...discount, type: e.target.value })}
              className="px-2 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900"
            >
              <option value="none">No Discount</option>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₹)</option>
            </select>

            {discount.type !== 'none' && (
              <input
                type="number"
                min="0"
                step="any"
                max={discount.type === 'percentage' ? 100 : totals.subtotal}
                placeholder={discount.type === 'percentage' ? 'e.g. 10' : 'e.g. 5000'}
                value={discount.value || ''}
                onChange={(e) =>
                  onChangeDiscount({ ...discount, value: Math.max(0, Number(e.target.value) || 0) })
                }
                className="flex-1 px-3 py-1.5 text-xs font-mono font-semibold rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            )}
          </div>
        </div>

        {/* Advance Token Received */}
        <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-2">
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
            Advance / Token Amount Received (₹)
          </label>
          <input
            type="number"
            min="0"
            max={totals.totalAmount || undefined}
            step="any"
            placeholder="0"
            value={tokenPaid}
            onChange={(e) => onChangeTokenPaid(e.target.value)}
            className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
          />
        </div>
      </div>

      {/* Real-time Calculation Breakdown Preview */}
      <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          <span>Quotation & Payment Breakdown</span>
          <span>{items.length} Line Item{items.length === 1 ? '' : 's'}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div>
            <span className="text-stone-400 block text-[11px]">Subtotal:</span>
            <span className="font-mono font-semibold text-stone-800 dark:text-stone-200 text-sm">
              ₹{totals.subtotal.toLocaleString()}
            </span>
            {totals.discountAmount > 0 && (
              <span className="text-[10px] text-emerald-600 block">
                Discount: -₹{totals.discountAmount.toLocaleString()}
              </span>
            )}
          </div>

          <div>
            <span className="text-stone-400 block text-[11px]">Total Project Cost:</span>
            <span className="font-mono font-bold text-stone-900 dark:text-stone-100 text-sm">
              ₹{totals.totalAmount.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-stone-400 block text-[11px]">Advance Received:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              ₹{tokenNum.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-stone-400 block text-[11px]">Remaining Due:</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
              ₹{remainingNum.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
