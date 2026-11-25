import { db } from '../database.js';
import { generateId } from '../../utils/id.js';
import { roundMoney } from '../../utils/finance.js';
import { getNextAnchorDate, getNextBillingDateISO } from '../../utils/dates.js';
import { invoicesRepo } from './invoicesRepo.js';

export const subscriptionsRepo = {
  async getAll({ clientId, status } = {}, database = db) {
    if (!database.subscriptions) return [];
    let collection = database.subscriptions.toCollection();

    if (clientId) {
      collection = database.subscriptions.where('clientId').equals(clientId);
    } else if (status) {
      collection = database.subscriptions.where('status').equals(status);
    }

    let items = await collection.sortBy('nextInvoiceDate');
    if (clientId && status) {
      items = items.filter((s) => s.status === status);
    }
    return items;
  },

  async getById(id, database = db) {
    if (!id || !database.subscriptions) return null;
    return database.subscriptions.get(id);
  },

  /**
   * Calculate current Monthly Recurring Revenue (MRR) across all active retainers
   */
  async getMRR(database = db) {
    if (!database.subscriptions) return 0;
    const active = await database.subscriptions.where('status').equals('active').toArray();
    const total = active.reduce((sum, sub) => {
      const amount = Number(sub.monthlyAmount || sub.amount) || 0;
      if (sub.billingFrequency === 'quarterly') return sum + amount / 3;
      if (sub.billingFrequency === 'yearly') return sum + amount / 12;
      return sum + amount; // monthly
    }, 0);
    return roundMoney(total);
  },

  async create(data, database = db) {
    const now = new Date().toISOString();
    const id = data.id || generateId();

    const startDate = data.startDate || now.slice(0, 10);
    const startObj = new Date(startDate);
    const billingAnchorDay = Math.min(31, Math.max(1, Number(data.billingAnchorDay) || startObj.getDate() || 1));

    // Next invoice date computed with anchor day preservation
    const nextInvoiceDate =
      data.nextInvoiceDate ||
      getNextBillingDateISO(billingAnchorDay, startDate, 1).slice(0, 10);

    const record = {
      id,
      clientId: data.clientId,
      clientName: (data.clientName || '').trim(),
      title: (data.title || 'Monthly Agency Retainer').trim(),
      monthlyAmount: roundMoney(Number(data.monthlyAmount || data.amount) || 0),
      billingFrequency: data.billingFrequency || 'monthly', // monthly, quarterly, yearly
      billingAnchorDay,
      startDate,
      endDate: data.endDate || null,
      nextInvoiceDate,
      renewalDate: data.renewalDate || null,
      gracePeriodDays: Number(data.gracePeriodDays) || 7,
      status: data.status || 'active', // active, paused, cancelled, expired
      notes: data.notes || '',
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    if (database.subscriptions) {
      await database.subscriptions.add(record);
    }
    return record;
  },

  async update(id, updates, database = db) {
    if (!database.subscriptions) return null;
    const existing = await database.subscriptions.get(id);
    if (!existing) throw new Error(`Subscription with id ${id} not found`);

    const now = new Date().toISOString();
    const cleanUpdates = {
      ...updates,
      updatedAt: now,
    };

    if (updates.monthlyAmount !== undefined) {
      cleanUpdates.monthlyAmount = roundMoney(Number(updates.monthlyAmount) || 0);
    }
    if (updates.billingAnchorDay !== undefined) {
      cleanUpdates.billingAnchorDay = Math.min(31, Math.max(1, Number(updates.billingAnchorDay) || 1));
    }

    await database.subscriptions.update(id, cleanUpdates);
    return database.subscriptions.get(id);
  },

  /**
   * Generates the next invoice for this subscription and updates nextInvoiceDate with anchor preservation
   */
  async generateNextInvoice(subscriptionId, database = db) {
    if (!database.subscriptions) return null;
    const sub = await database.subscriptions.get(subscriptionId);
    if (!sub) throw new Error(`Subscription ${subscriptionId} not found`);

    const monthsIncrement = sub.billingFrequency === 'quarterly' ? 3 : sub.billingFrequency === 'yearly' ? 12 : 1;

    // Issue invoice
    const issueDate = sub.nextInvoiceDate || new Date().toISOString().slice(0, 10);
    const dueDate = new Date(new Date(issueDate).getTime() + (sub.gracePeriodDays || 7) * 86400000)
      .toISOString()
      .slice(0, 10);

    const invoice = await invoicesRepo.create(
      {
        clientId: sub.clientId,
        clientName: sub.clientName,
        subscriptionId: sub.id,
        issueDate,
        dueDate,
        items: [
          {
            description: `${sub.title} (${issueDate.slice(0, 7)})`,
            quantity: 1,
            unitPrice: sub.monthlyAmount,
          },
        ],
        notes: `Auto-generated retainer invoice for ${sub.title}`,
      },
      database
    );

    // Compute next invoice date preserving original anchor day
    const nextDateObj = getNextAnchorDate(sub.billingAnchorDay, issueDate, monthsIncrement);
    const nextInvoiceDate = nextDateObj.toISOString().slice(0, 10);

    await database.subscriptions.update(sub.id, {
      nextInvoiceDate,
      updatedAt: new Date().toISOString(),
    });

    return invoice;
  },

  async delete(id, database = db) {
    if (!database.subscriptions) return false;
    return database.subscriptions.delete(id);
  },
};
