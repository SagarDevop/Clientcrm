import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator } from 'lucide-react';
import { db } from '../../db/database.js';
import { invoicesRepo } from '../../db/repositories/invoicesRepo.js';
import { calculateInvoiceTotals, roundMoney } from '../../utils/finance.js';

export function InvoiceFormModal({ isOpen, onClose, onSaved, initialClientId = null, editInvoice = null }) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(initialClientId || '');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [paymentTerms, setPaymentTerms] = useState('Net 7');
  const [items, setItems] = useState([
    { description: 'Agency Services', quantity: 1, unitPrice: 0 },
  ]);
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('Payment via Bank Transfer / UPI. Thank you for your business!');
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
      if (editInvoice) {
        setClientId(editInvoice.clientId || '');
        setIssueDate(editInvoice.issueDate || new Date().toISOString().slice(0, 10));
        setDueDate(editInvoice.dueDate || new Date().toISOString().slice(0, 10));
        setPaymentTerms(editInvoice.paymentTerms || 'Net 7');
        setItems(
          Array.isArray(editInvoice.items) && editInvoice.items.length > 0
            ? editInvoice.items
            : [{ description: 'Agency Services', quantity: 1, unitPrice: 0 }]
        );
        setDiscountType(editInvoice.discountType || 'fixed');
        setDiscountValue(editInvoice.discountValue || 0);
        setTaxRate(editInvoice.taxRate || 0);
        setNotes(editInvoice.notes || '');
      } else {
        setClientId(initialClientId || '');
        setItems([{ description: 'Agency Services', quantity: 1, unitPrice: 0 }]);
        setDiscountValue(0);
        setTaxRate(0);
      }
      setError('');
    }
  }, [isOpen, editInvoice, initialClientId]);

  if (!isOpen) return null;

  const totals = calculateInvoiceTotals({
    lineItems: items,
    discountType,
    discountValue,
    taxRate,
  });

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) {
      setError('Please select a client');
      return;
    }
    const validItems = items.filter((it) => it.description.trim() && Number(it.unitPrice) >= 0);
    if (validItems.length === 0) {
      setError('Please add at least one line item with a description');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const selectedClient = clients.find((c) => c.id === clientId);
      const invoiceData = {
        clientId,
        clientName: selectedClient ? selectedClient.name : '',
        issueDate,
        dueDate,
        paymentTerms,
        items: validItems,
        discountType,
        discountValue: Number(discountValue) || 0,
        taxRate: Number(taxRate) || 0,
        notes,
      };

      let result;
      if (editInvoice && editInvoice.id) {
        result = await invoicesRepo.update(editInvoice.id, invoiceData);
      } else {
        result = await invoicesRepo.create(invoiceData);
      }

      if (onSaved) onSaved(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {editInvoice ? `Edit Invoice ${editInvoice.invoiceNumber}` : 'Create New Invoice'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Generate a client invoice with automatic decimal-safe totals
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          {/* Client Selection & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Client *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
                Issue Date *
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                Line Items
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/70 dark:border-stone-800"
                >
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      placeholder="Service or deliverable description..."
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-center"
                      />
                    </div>

                    <div className="w-32">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-xs text-stone-400 font-medium">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="w-full pl-6 pr-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono"
                        />
                      </div>
                    </div>

                    <div className="w-24 text-right font-mono text-sm font-semibold text-stone-700 dark:text-stone-300">
                      ₹{roundMoney((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)).toLocaleString()}
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discount, Tax & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-stone-100 dark:border-stone-800">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Discount
                </label>
                <div className="flex gap-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-28 px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="fixed">Fixed (₹)</option>
                    <option value="percentage">Percent (%)</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 18 for 18% GST"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Notes & Payment Instructions
                </label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-none"
                />
              </div>
            </div>

            {/* Calculations Breakdown Card */}
            <div className="bg-stone-50 dark:bg-stone-800/60 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 space-y-2.5 flex flex-col justify-center">
              <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">₹{totals.subtotal.toLocaleString()}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span>Discount:</span>
                  <span className="font-mono font-medium">-₹{totals.discountAmount.toLocaleString()}</span>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400">
                  <span>Tax ({totals.taxRate}%):</span>
                  <span className="font-mono font-medium">+₹{totals.taxAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-stone-200 dark:border-stone-700 flex justify-between items-baseline">
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100">Total Due:</span>
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{totals.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editInvoice ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
