import { db } from '../database.js';
import { generateId } from '../../utils/id.js';
import { roundMoney, calculatePaymentBalances } from '../../utils/finance.js';

export const paymentsRepo = {
  async getAll({ clientId, projectId, invoiceId, status } = {}, database = db) {
    let collection = database.payments.toCollection();

    if (clientId) {
      collection = database.payments.where('clientId').equals(clientId);
    } else if (projectId) {
      collection = database.payments.where('projectId').equals(projectId);
    } else if (invoiceId) {
      collection = database.payments.where('invoiceId').equals(invoiceId);
    } else if (status) {
      collection = database.payments.where('status').equals(status);
    }

    let payments = await collection.sortBy('paidAt');
    payments.reverse();

    if (clientId && projectId) {
      payments = payments.filter((p) => p.projectId === projectId);
    }

    if (invoiceId && (clientId || projectId)) {
      payments = payments.filter((p) => p.invoiceId === invoiceId);
    }

    if (status && (clientId || projectId || invoiceId)) {
      payments = payments.filter((p) => p.status === status);
    }

    return payments;
  },

  async getById(id, database = db) {
    if (!id) return null;
    return database.payments.get(id);
  },

  /**
   * Detect potential duplicate payments (same client, amount, reference or date)
   */
  async findPotentialDuplicate({ clientId, amount, reference, paidAt, excludeId } = {}, database = db) {
    if (!clientId || !amount) return null;

    const payments = await database.payments.where('clientId').equals(clientId).toArray();
    const targetAmount = roundMoney(Math.abs(Number(amount)));
    const targetRef = (reference || '').trim().toLowerCase();
    const targetDate = paidAt ? paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10);

    return payments.find((p) => {
      if (excludeId && p.id === excludeId) return false;
      if (p.status === 'void' || p.status === 'cancelled') return false;

      const pAmount = roundMoney(Math.abs(Number(p.amount)));
      const pRef = (p.reference || '').trim().toLowerCase();
      const pDate = p.paidAt ? p.paidAt.slice(0, 10) : '';

      // Same reference and same client
      if (targetRef && pRef && targetRef === pRef) {
        return true;
      }

      // Same amount and exact same date
      if (pAmount === targetAmount && pDate === targetDate) {
        return true;
      }

      return false;
    });
  },

  async create(data, optionsOrDb = {}, databaseArg = undefined) {
    let allowDuplicate = false;
    let database = db;

    if (optionsOrDb && optionsOrDb.payments) {
      database = optionsOrDb;
    } else {
      allowDuplicate = Boolean(optionsOrDb?.allowDuplicate);
      database = databaseArg || db;
    }

    const now = new Date().toISOString();
    const id = data.id || generateId();

    const rawAmount = Number(data.amount) || 0;
    // For payments and refunds, amount is positive. For adjustments, preserve sign.
    const amount =
      data.type === 'adjustment'
        ? roundMoney(rawAmount)
        : roundMoney(Math.abs(rawAmount));

    if (!allowDuplicate) {
      const duplicate = await this.findPotentialDuplicate({
        clientId: data.clientId,
        amount,
        reference: data.reference,
        paidAt: data.paidAt,
      }, database);

      if (duplicate) {
        throw new Error(
          `Potential duplicate payment detected! A transaction for ${duplicate.amount} with reference "${duplicate.reference || 'N/A'}" was already recorded on ${duplicate.paidAt?.slice(0, 10)}.`
        );
      }
    }

    const record = {
      id,
      clientId: data.clientId,
      projectId: data.projectId || null,
      invoiceId: data.invoiceId || null,
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
      const raw = Number(updates.amount) || 0;
      cleanUpdates.amount =
        existing.type === 'adjustment' || updates.type === 'adjustment'
          ? roundMoney(raw)
          : roundMoney(Math.abs(raw));
    }
    if (updates.reference !== undefined) cleanUpdates.reference = updates.reference.trim();

    await database.payments.update(id, cleanUpdates);
    return database.payments.get(id);
  },

  async voidTransaction(id, reason = '', database = db) {
    const existing = await database.payments.get(id);
    if (!existing) throw new Error(`Payment with id ${id} not found`);

    const now = new Date().toISOString();
    const notes = existing.notes
      ? `${existing.notes}\n[VOIDED: ${reason || 'User voided'}]`
      : `[VOIDED: ${reason || 'User voided'}]`;

    await database.payments.update(id, {
      status: 'void',
      notes,
      updatedAt: now,
    });
    return database.payments.get(id);
  },

  /**
   * Calculates financial summary for client, project, or overall business
   * Uses centralized financial calculation engine
   */
  async getFinancialSummary({ clientId, projectId, invoiceId } = {}, database = db) {
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

    const payments = await this.getAll({ clientId, projectId, invoiceId }, database);
    const balances = calculatePaymentBalances(payments);

    const outstanding = Math.max(0, roundMoney(agreedAmount - balances.netClearedCash));
    const overpaid = Math.max(0, roundMoney(balances.netClearedCash - agreedAmount));

    return {
      agreedAmount: roundMoney(agreedAmount),
      recordedCollected: balances.clearedPayments,
      recordedRefunds: balances.clearedRefunds,
      recordedAdjustments: balances.clearedAdjustments,
      netReceived: balances.netClearedCash,
      outstanding,
      overpaid,
      pendingAmount: balances.pendingAmount,
      voidedAmount: balances.voidedAmount,
      transactionCount: payments.length,
    };
  },

  async delete(id, database = db) {
    return database.payments.delete(id);
  },
};
