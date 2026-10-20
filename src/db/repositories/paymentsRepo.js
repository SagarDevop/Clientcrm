import { db } from '../database.js';
import { generateId } from '../../utils/id.js';

export const paymentsRepo = {
  async getAll({ clientId, projectId, status } = {}, database = db) {
    let collection = database.payments.toCollection();

    if (clientId) {
      collection = database.payments.where('clientId').equals(clientId);
    } else if (projectId) {
      collection = database.payments.where('projectId').equals(projectId);
    } else if (status) {
      collection = database.payments.where('status').equals(status);
    }

    let payments = await collection.sortBy('paidAt');
    payments.reverse();

    if (clientId && projectId) {
      payments = payments.filter((p) => p.projectId === projectId);
    }

    if (status && (clientId || projectId)) {
      payments = payments.filter((p) => p.status === status);
    }

    return payments;
  },

  async getById(id, database = db) {
    if (!id) return null;
    return database.payments.get(id);
  },

  async create(data, database = db) {
    const now = new Date().toISOString();
    const id = data.id || generateId();
    const amount = Math.abs(Number(data.amount) || 0);

    const record = {
      id,
      clientId: data.clientId,
      projectId: data.projectId || null,
      type: data.type || 'payment', // payment, refund, adjustment
      amount,
      paidAt: data.paidAt || now,
      method: data.method || 'bank_transfer', // cash, bank_transfer, upi, other
      status: data.status || 'recorded', // recorded, pending, void
      reference: (data.reference || '').trim(),
      notes: data.notes || '',
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    await database.payments.add(record);
    return record;
  },

  async update(id, updates, database = db) {
    const existing = await database.payments.get(id);
    if (!existing) throw new Error(`Payment with id ${id} not found`);

    const now = new Date().toISOString();
    const cleanUpdates = {
      ...updates,
      updatedAt: now,
    };

    if (updates.amount !== undefined) {
      cleanUpdates.amount = Math.abs(Number(updates.amount) || 0);
    }
    if (updates.reference !== undefined) cleanUpdates.reference = updates.reference.trim();

    await database.payments.update(id, cleanUpdates);
    return database.payments.get(id);
  },

  async voidTransaction(id, reason = '', database = db) {
    const existing = await database.payments.get(id);
    if (!existing) throw new Error(`Payment with id ${id} not found`);

    const now = new Date().toISOString();
    const notes = existing.notes ? `${existing.notes}\n[VOIDED: ${reason || 'User voided'}]` : `[VOIDED: ${reason || 'User voided'}]`;

    await database.payments.update(id, {
      status: 'void',
      notes,
      updatedAt: now,
    });
    return database.payments.get(id);
  },

  /**
   * Calculates financial summary for client, project, or overall business
   */
  async getFinancialSummary({ clientId, projectId } = {}, database = db) {
    // 1. Calculate agreed amount
    let agreedAmount = 0;
    if (projectId) {
      const project = await database.projects.get(projectId);
      agreedAmount = project ? Number(project.agreedAmount) || 0 : 0;
    } else if (clientId) {
      const clientProjects = await database.projects.where('clientId').equals(clientId).toArray();
      agreedAmount = clientProjects.reduce((sum, p) => sum + (Number(p.agreedAmount) || 0), 0);
    } else {
      const allProjects = await database.projects.toArray();
      agreedAmount = allProjects.reduce((sum, p) => sum + (Number(p.agreedAmount) || 0), 0);
    }

    // 2. Fetch payments
    let payments = await this.getAll({ clientId, projectId }, database);

    let recordedCollected = 0;
    let recordedRefunds = 0;
    let recordedAdjustments = 0;
    let pendingAmount = 0;
    let voidedAmount = 0;

    for (const p of payments) {
      const amt = Number(p.amount) || 0;
      if (p.status === 'void') {
        voidedAmount += amt;
        continue;
      }
      if (p.status === 'pending') {
        pendingAmount += amt;
        continue;
      }

      if (p.status === 'recorded') {
        if (p.type === 'payment') {
          recordedCollected += amt;
        } else if (p.type === 'refund') {
          recordedRefunds += amt;
        } else if (p.type === 'adjustment') {
          recordedAdjustments += amt;
        }
      }
    }

    const netReceived = recordedCollected - recordedRefunds + recordedAdjustments;
    const outstanding = Math.max(0, agreedAmount - netReceived);
    const overpaid = Math.max(0, netReceived - agreedAmount);

    return {
      agreedAmount,
      recordedCollected,
      recordedRefunds,
      recordedAdjustments,
      netReceived,
      outstanding,
      overpaid,
      pendingAmount,
      voidedAmount,
      transactionCount: payments.length,
    };
  },

  async delete(id, database = db) {
    return database.payments.delete(id);
  },
};
