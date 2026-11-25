import { db } from '../database.js';
import { generateId } from '../../utils/id.js';
import {
  roundMoney,
  calculateInvoiceTotals,
  evaluateInvoiceStatus,
} from '../../utils/finance.js';

export const invoicesRepo = {
  async getAll({ clientId, status, search } = {}, database = db) {
    if (!database.invoices) return [];
    let collection = database.invoices.toCollection();

    if (clientId) {
      collection = database.invoices.where('clientId').equals(clientId);
    } else if (status) {
      collection = database.invoices.where('status').equals(status);
    }

    let invoices = await collection.sortBy('issueDate');
    invoices.reverse(); // newest first

    if (clientId && status) {
      invoices = invoices.filter((inv) => inv.status === status);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      invoices = invoices.filter(
        (inv) =>
          (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
          (inv.clientName && inv.clientName.toLowerCase().includes(q)) ||
          (inv.notes && inv.notes.toLowerCase().includes(q))
      );
    }

    return invoices;
  },

  async getById(id, database = db) {
    if (!id || !database.invoices) return null;
    return database.invoices.get(id);
  },

  async generateInvoiceNumber(database = db) {
    const year = new Date().getFullYear();
    const count = database.invoices ? await database.invoices.count() : 0;
    const seq = String(count + 1).padStart(4, '0');
    return `INV-${year}-${seq}`;
  },

  async create(data, database = db) {
    const now = new Date().toISOString();
    const id = data.id || generateId();

    const invoiceNumber =
      (data.invoiceNumber || '').trim() || (await this.generateInvoiceNumber(database));

    // Calculate totals using central financial engine
    const lineItems = Array.isArray(data.items) ? data.items : (Array.isArray(data.lineItems) ? data.lineItems : []);
    const totals = calculateInvoiceTotals({
      lineItems,
      discountType: data.discountType || 'fixed',
      discountValue: data.discountValue || 0,
      taxRate: data.taxRate || 0,
    });

    const status = evaluateInvoiceStatus({
      total: totals.total,
      paidAmount: Number(data.paidAmount) || 0,
      dueDate: data.dueDate,
      status: data.status || 'unpaid',
    });

    const record = {
      id,
      invoiceNumber,
      clientId: data.clientId,
      clientName: (data.clientName || '').trim(),
      projectId: data.projectId || null,
      subscriptionId: data.subscriptionId || null,
      issueDate: data.issueDate || now.slice(0, 10),
      dueDate: data.dueDate || now.slice(0, 10),
      status, // draft, unpaid, partially_paid, paid, overdue, void
      currency: data.currency || 'INR',
      items: lineItems,
      subtotal: totals.subtotal,
      discountType: data.discountType || 'fixed',
      discountValue: Number(data.discountValue) || 0,
      discountAmount: totals.discountAmount,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      total: totals.total,
      paidAmount: roundMoney(Number(data.paidAmount) || 0),
      notes: data.notes || '',
      paymentTerms: data.paymentTerms || 'Due on receipt',
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    if (database.invoices) {
      await database.invoices.add(record);
    }
    return record;
  },

  async update(id, updates, database = db) {
    if (!database.invoices) return null;
    const existing = await database.invoices.get(id);
    if (!existing) throw new Error(`Invoice with id ${id} not found`);

    const now = new Date().toISOString();
    const lineItems = updates.items || updates.lineItems || existing.items || [];
    const discountType = updates.discountType !== undefined ? updates.discountType : existing.discountType;
    const discountValue = updates.discountValue !== undefined ? updates.discountValue : existing.discountValue;
    const taxRate = updates.taxRate !== undefined ? updates.taxRate : existing.taxRate;
    const dueDate = updates.dueDate !== undefined ? updates.dueDate : existing.dueDate;
    const paidAmount = updates.paidAmount !== undefined ? roundMoney(Number(updates.paidAmount)) : existing.paidAmount;

    const totals = calculateInvoiceTotals({
      lineItems,
      discountType,
      discountValue,
      taxRate,
    });

    const status = evaluateInvoiceStatus({
      total: totals.total,
      paidAmount,
      dueDate,
      currentStatus: updates.status || existing.status,
    });

    const cleanUpdates = {
      ...updates,
      items: lineItems,
      subtotal: totals.subtotal,
      discountType,
      discountValue: Number(discountValue) || 0,
      discountAmount: totals.discountAmount,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      total: totals.total,
      paidAmount,
      status,
      updatedAt: now,
    };

    await database.invoices.update(id, cleanUpdates);
    return database.invoices.get(id);
  },

  /**
   * Recalculate invoice paid amount and status based on linked payments
   */
  async refreshPaymentStatus(invoiceId, database = db) {
    if (!invoiceId || !database.invoices) return null;
    const invoice = await database.invoices.get(invoiceId);
    if (!invoice) return null;

    let clearedPaid = 0;
    if (database.payments) {
      const payments = await database.payments.where('invoiceId').equals(invoiceId).toArray();
      for (const p of payments) {
        if (p.status === 'void' || p.status === 'cancelled') continue;
        if (p.type === 'payment') clearedPaid += Number(p.amount) || 0;
        if (p.type === 'refund') clearedPaid -= Number(p.amount) || 0;
        if (p.type === 'adjustment') clearedPaid += Number(p.amount) || 0;
      }
    }
    clearedPaid = roundMoney(Math.max(0, clearedPaid));

    const status = evaluateInvoiceStatus({
      total: invoice.total,
      paidAmount: clearedPaid,
      dueDate: invoice.dueDate,
      currentStatus: invoice.status === 'void' ? 'void' : undefined,
    });

    await database.invoices.update(invoiceId, {
      paidAmount: clearedPaid,
      status,
      updatedAt: new Date().toISOString(),
    });

    return database.invoices.get(invoiceId);
  },

  async voidInvoice(id, reason = '', database = db) {
    if (!database.invoices) return null;
    const existing = await database.invoices.get(id);
    if (!existing) throw new Error(`Invoice with id ${id} not found`);

    const now = new Date().toISOString();
    const notes = existing.notes
      ? `${existing.notes}\n[VOIDED: ${reason || 'User voided'}]`
      : `[VOIDED: ${reason || 'User voided'}]`;

    await database.invoices.update(id, {
      status: 'void',
      notes,
      updatedAt: now,
    });
    return database.invoices.get(id);
  },

  async delete(id, database = db) {
    if (!database.invoices) return false;
    const existing = await database.invoices.get(id);
    if (!existing) return false;

    // Check if there are cleared payments recorded against this invoice
    if (database.payments) {
      const linkedPayments = await database.payments.where('invoiceId').equals(id).toArray();
      const activePayments = linkedPayments.filter((p) => p.status !== 'void');
      if (activePayments.length > 0) {
        throw new Error(
          `Cannot delete invoice ${existing.invoiceNumber} because it has ${activePayments.length} recorded payment(s). Void the invoice instead to preserve financial audit trail.`
        );
      }
    }

    return database.invoices.delete(id);
  },
};
