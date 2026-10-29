import { db } from '../database.js';
import { generateId } from '../../utils/id.js';
import { roundMoney } from '../../utils/finance.js';

export function calculateQuotationTotals(items = [], discount = { type: 'none', value: 0 }) {
  const normalizedItems = (items || []).map((item, idx) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Math.max(0, roundMoney(Number(item.unitPrice) || 0));
    const total = roundMoney(qty * unitPrice);
    return {
      id: item.id || `item_${idx}_${Date.now()}`,
      name: (item.name || '').trim(),
      description: (item.description || '').trim(),
      quantity: qty,
      unitPrice,
      total,
    };
  });

  const subtotal = roundMoney(normalizedItems.reduce((sum, item) => sum + item.total, 0));

  let discountAmount = 0;
  const dVal = Number(discount?.value) || 0;
  if (discount?.type === 'percentage' && dVal > 0) {
    const pct = Math.min(100, Math.max(0, dVal));
    discountAmount = roundMoney((subtotal * pct) / 100);
  } else if (discount?.type === 'fixed' && dVal > 0) {
    discountAmount = roundMoney(Math.min(subtotal, Math.max(0, dVal)));
  }

  const totalAmount = roundMoney(Math.max(0, subtotal - discountAmount));

  return {
    items: normalizedItems,
    subtotal,
    discountType: discount?.type || 'none',
    discountValue: dVal,
    discountAmount,
    totalAmount,
  };
}

export function generateQuotationNumber(prefix = 'QT-WEB') {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${datePart}-${randPart}`;
}

export const quotationsRepo = {
  async getAll({ clientId, projectId, status } = {}, database = db) {
    if (!database.quotations) return [];
    let collection = database.quotations.toCollection();

    if (clientId) {
      collection = database.quotations.where('clientId').equals(clientId);
    } else if (projectId) {
      collection = database.quotations.where('projectId').equals(projectId);
    } else if (status) {
      collection = database.quotations.where('status').equals(status);
    }

    let quotations = await collection.sortBy('createdAt');
    quotations.reverse();

    if (clientId && projectId) {
      quotations = quotations.filter((q) => q.projectId === projectId);
    }

    return quotations;
  },

  async getById(id, database = db) {
    if (!id || !database.quotations) return null;
    return database.quotations.get(id);
  },

  async getByClientId(clientId, database = db) {
    if (!clientId || !database.quotations) return null;
    return database.quotations.where('clientId').equals(clientId).first();
  },

  async create(data, database = db) {
    const now = new Date().toISOString();
    const id = data.id || generateId();
    const quotationNumber = data.quotationNumber || generateQuotationNumber();

    const totals = calculateQuotationTotals(data.items, {
      type: data.discountType || 'none',
      value: data.discountValue || 0,
    });

    const advanceReceived = roundMoney(Number(data.advanceReceived) || 0);
    const remainingBalance = roundMoney(Math.max(0, totals.totalAmount - advanceReceived));

    const record = {
      id,
      quotationNumber,
      clientId: data.clientId,
      projectId: data.projectId || null,
      clientName: (data.clientName || '').trim(),
      businessName: (data.businessName || '').trim(),
      clientEmail: (data.clientEmail || '').trim().toLowerCase(),
      clientPhone: (data.clientPhone || '').trim(),
      projectName: (data.projectName || '').trim(),
      projectDescription: (data.projectDescription || '').trim(),
      items: totals.items,
      subtotal: totals.subtotal,
      discountType: totals.discountType,
      discountValue: totals.discountValue,
      discountAmount: totals.discountAmount,
      totalAmount: totals.totalAmount,
      advanceReceived,
      remainingBalance,
      paymentTerms: (data.paymentTerms || '50% advance, 50% on project delivery').trim(),
      startDate: data.startDate || now.slice(0, 10),
      deliveryDate: data.deliveryDate || null,
      status: data.status || 'accepted', // draft, sent, accepted, rejected
      notes: (data.notes || '').trim(),
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    if (database.quotations) {
      await database.quotations.add(record);
    }

    return record;
  },

  async update(id, updates, database = db) {
    if (!database.quotations) return null;
    const existing = await database.quotations.get(id);
    if (!existing) throw new Error(`Quotation with id ${id} not found`);

    const now = new Date().toISOString();
    let computed = {};

    if (updates.items !== undefined || updates.discountType !== undefined || updates.discountValue !== undefined) {
      const items = updates.items !== undefined ? updates.items : existing.items;
      const discountType = updates.discountType !== undefined ? updates.discountType : existing.discountType;
      const discountValue = updates.discountValue !== undefined ? updates.discountValue : existing.discountValue;
      const totals = calculateQuotationTotals(items, { type: discountType, value: discountValue });

      const advance = roundMoney(
        Number(updates.advanceReceived !== undefined ? updates.advanceReceived : existing.advanceReceived) || 0
      );
      const remaining = roundMoney(Math.max(0, totals.totalAmount - advance));

      computed = {
        items: totals.items,
        subtotal: totals.subtotal,
        discountType: totals.discountType,
        discountValue: totals.discountValue,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        advanceReceived: advance,
        remainingBalance: remaining,
      };
    }

    const cleanUpdates = {
      ...updates,
      ...computed,
      updatedAt: now,
    };

    await database.quotations.update(id, cleanUpdates);
    return database.quotations.get(id);
  },

  async delete(id, database = db) {
    if (!database.quotations) return;
    return database.quotations.delete(id);
  },
};
