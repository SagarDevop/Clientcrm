import { db } from '../database.js';
import { generateId, normalizePhone } from '../../utils/id.js';
import { roundMoney } from '../../utils/finance.js';
import { getNextBillingDateISO } from '../../utils/dates.js';
import { paymentsRepo } from './paymentsRepo.js';

export const clientsRepo = {
  async getAll({ status, serviceId, search } = {}, database = db) {
    let collection = database.clients.toCollection();

    if (status) {
      collection = database.clients.where('status').equals(status);
    }

    let clients = await collection.sortBy('createdAt');
    clients.reverse(); // newest first

    if (serviceId) {
      clients = clients.filter((c) => Array.isArray(c.serviceIds) && c.serviceIds.includes(serviceId));
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const normQ = normalizePhone(q);
      clients = clients.filter((c) => {
        return (
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.businessName && c.businessName.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (normQ && c.normalizedPhone && c.normalizedPhone.includes(normQ))
        );
      });
    }

    return clients;
  },

  async getById(id, database = db) {
    if (!id) return null;
    return database.clients.get(id);
  },

  async findDuplicates({ phone, email, name, excludeId }, database = db) {
    const warnings = [];
    const norm = normalizePhone(phone);

    if (norm) {
      const match = await database.clients.where('normalizedPhone').equals(norm).first();
      if (match && match.id !== excludeId) {
        warnings.push({
          field: 'phone',
          message: `Another client "${match.name}" has the same phone number (${match.phone}).`,
          existing: match,
        });
      }
    }

    if (email && email.trim()) {
      const match = await database.clients.where('email').equalsIgnoreCase(email.trim()).first();
      if (match && match.id !== excludeId) {
        warnings.push({
          field: 'email',
          message: `Another client "${match.name}" has the same email address (${match.email}).`,
          existing: match,
        });
      }
    }

    if (name && name.trim()) {
      const match = await database.clients.where('name').equalsIgnoreCase(name.trim()).first();
      if (match && match.id !== excludeId) {
        warnings.push({
          field: 'name',
          message: `A client named "${match.name}" already exists.`,
          existing: match,
        });
      }
    }

    return warnings;
  },

  async checkLinkedRecords(id, database = db) {
    if (!id) return { canDelete: true, total: 0, details: {} };
    const details = {};

    if (database.projects) {
      const count = await database.projects.where('clientId').equals(id).count();
      if (count > 0) details.projects = count;
    }
    if (database.invoices) {
      const count = await database.invoices.where('clientId').equals(id).count();
      if (count > 0) details.invoices = count;
    }
    if (database.payments) {
      const count = await database.payments.where('clientId').equals(id).count();
      if (count > 0) details.payments = count;
    }
    if (database.subscriptions) {
      const count = await database.subscriptions.where('clientId').equals(id).count();
      if (count > 0) details.subscriptions = count;
    }
    if (database.content_items) {
      const count = await database.content_items.where('clientId').equals(id).count();
      if (count > 0) details.content_items = count;
    }
    if (database.tasks) {
      const count = await database.tasks.where('clientId').equals(id).count();
      if (count > 0) details.tasks = count;
    }

    const total = Object.values(details).reduce((sum, val) => sum + val, 0);
    return {
      canDelete: total === 0,
      total,
      details,
    };
  },

  async create(data, database = db) {
    const now = new Date().toISOString();
    const id = data.id || generateId();
    const phone = (data.phone || '').trim();
    const whatsapp = (data.whatsapp || phone).trim();
    const record = {
      id,
      name: (data.name || '').trim(),
      phone,
      whatsapp,
      normalizedPhone: normalizePhone(phone),
      businessName: (data.businessName || '').trim(),
      email: (data.email || '').trim().toLowerCase(),
      status: data.status || 'active', // lead, active, paused, completed, archived
      category: data.category || 'both', // content, web_dev, both
      serviceIds: Array.isArray(data.serviceIds) ? data.serviceIds : [],
      monthlyRetainer: Number(data.monthlyRetainer) || 0,
      agreementStartDate: data.agreementStartDate || null,
      agreementEndDate: data.agreementEndDate || null,
      nextRenewalDate: data.nextRenewalDate || null,
      paymentTerms: data.paymentTerms || 'Due on receipt',
      source: (data.source || '').trim(),
      notes: data.notes || '',
      createdAt: data.createdAt || now,
      updatedAt: now,
      archivedAt: data.status === 'archived' ? now : null,
    };

    await database.clients.add(record);
    return record;
  },

  async update(id, updates, database = db) {
    const existing = await database.clients.get(id);
    if (!existing) throw new Error(`Client with id ${id} not found`);

    const now = new Date().toISOString();
    const cleanUpdates = {
      ...updates,
      updatedAt: now,
    };

    if (updates.name !== undefined) cleanUpdates.name = updates.name.trim();
    if (updates.businessName !== undefined) cleanUpdates.businessName = updates.businessName.trim();
    if (updates.email !== undefined) cleanUpdates.email = updates.email.trim().toLowerCase();
    if (updates.phone !== undefined) {
      cleanUpdates.phone = updates.phone.trim();
      cleanUpdates.normalizedPhone = normalizePhone(updates.phone);
    }
    if (updates.whatsapp !== undefined) cleanUpdates.whatsapp = updates.whatsapp.trim();
    if (updates.monthlyRetainer !== undefined) cleanUpdates.monthlyRetainer = Number(updates.monthlyRetainer) || 0;
    if (updates.status === 'archived' && !existing.archivedAt) {
      cleanUpdates.archivedAt = now;
    } else if (updates.status && updates.status !== 'archived') {
      cleanUpdates.archivedAt = null;
    }

    await database.clients.update(id, cleanUpdates);
    return database.clients.get(id);
  },

  async archive(id, database = db) {
    const now = new Date().toISOString();
    await database.clients.update(id, {
      status: 'archived',
      archivedAt: now,
      updatedAt: now,
    });
    return database.clients.get(id);
  },

  async restore(id, database = db) {
    const now = new Date().toISOString();
    await database.clients.update(id, {
      status: 'active',
      archivedAt: null,
      updatedAt: now,
    });
    return database.clients.get(id);
  },

  async delete(id, database = db) {
    const check = await this.checkLinkedRecords(id, database);
    if (!check.canDelete) {
      const summary = Object.entries(check.details)
        .map(([key, count]) => `${count} ${key}`)
        .join(', ');
      throw new Error(
        `Cannot delete client because it has linked records (${summary}). Archive the client instead to preserve historical records.`
      );
    }
    return database.clients.delete(id);
  },

  /**
   * Create client with 1-month service plan, token payment, and completion date
   */
  async createWithPlan(data, database = db) {
    const now = new Date().toISOString();
    const id = data.id || generateId();
    const phone = (data.phone || '').trim();
    const whatsapp = (data.whatsapp || phone).trim();

    const monthlyPlanAmount = roundMoney(Number(data.monthlyPlanAmount) || 0);
    const tokenPaid = roundMoney(Number(data.tokenPaid) || 0);

    if (tokenPaid < 0) {
      throw new Error('Token payment cannot be negative');
    }
    if (tokenPaid > monthlyPlanAmount) {
      throw new Error('Token payment cannot exceed monthly plan amount');
    }

    const remainingAmount = roundMoney(monthlyPlanAmount - tokenPaid);
    const startDate = data.startDate || now.slice(0, 10);
    const startObj = new Date(startDate);
    const billingAnchorDay = Math.min(31, Math.max(1, Number(data.billingAnchorDay) || startObj.getDate() || 1));
    const completionDate = data.completionDate || getNextBillingDateISO(billingAnchorDay, startDate, 1).slice(0, 10);

    const paymentStatus = remainingAmount === 0 ? 'paid' : tokenPaid > 0 ? 'partially_paid' : 'unpaid';

    const record = {
      id,
      name: (data.name || '').trim(),
      businessName: (data.businessName || '').trim(),
      email: (data.email || '').trim().toLowerCase(),
      phone,
      whatsapp,
      normalizedPhone: normalizePhone(phone),
      status: data.status || 'active', // active, completed, inactive

      // Monthly Plan & Financials
      monthlyPlanAmount,
      tokenPaid,
      additionalPaid: 0,
      totalPaid: tokenPaid,
      remainingAmount,
      paymentStatus,

      // Service Dates
      startDate,
      completionDate,
      billingAnchorDay,

      // Details
      packageDescription: (data.packageDescription || '').trim(),
      notes: (data.notes || '').trim(),

      // Status of automated emails
      onboardingEmailStatus: 'pending',
      completionEmailStatus: 'pending',

      // Period tracking history
      periods: [],
      currentPeriod: {
        periodNumber: 1,
        startDate,
        completionDate,
        monthlyPlanAmount,
        tokenPaid,
        additionalPaid: 0,
        totalPaid: tokenPaid,
        remainingAmount,
        paymentStatus,
      },

      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    await database.clients.add(record);

    // Record token in payments table if > 0
    if (tokenPaid > 0 && database.payments) {
      await paymentsRepo.create(
        {
          clientId: id,
          amount: tokenPaid,
          type: 'token',
          status: 'completed',
          paymentMethod: data.tokenPaymentMethod || 'bank_transfer',
          paidAt: new Date(startDate).toISOString(),
          notes: `Initial token for 1-month plan (${startDate} to ${completionDate})`,
        },
        { allowDuplicate: true },
        database
      );
    }

    return record;
  },

  /**
   * Record additional payment for client's current plan period
   */
  async recordPayment(clientId, { amount, paymentMethod = 'bank_transfer', paidAt, notes }, database = db) {
    const client = await database.clients.get(clientId);
    if (!client) throw new Error(`Client with id ${clientId} not found`);

    const payAmount = roundMoney(Number(amount) || 0);
    if (payAmount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const currentRemaining = roundMoney(Number(client.remainingAmount || 0));
    if (payAmount > currentRemaining) {
      throw new Error(`Payment (₹${payAmount}) cannot exceed remaining balance (₹${currentRemaining})`);
    }

    const newAdditional = roundMoney((Number(client.additionalPaid) || 0) + payAmount);
    const newTotalPaid = roundMoney((Number(client.tokenPaid) || 0) + newAdditional);
    const newRemaining = roundMoney(Math.max(0, (Number(client.monthlyPlanAmount) || 0) - newTotalPaid));
    const newStatus = newRemaining === 0 ? 'paid' : 'partially_paid';

    const now = new Date().toISOString();
    const paymentRecord = {
      clientId,
      amount: payAmount,
      type: 'additional',
      status: 'completed',
      paymentMethod,
      paidAt: paidAt ? new Date(paidAt).toISOString() : now,
      notes: notes || `Plan payment for ${client.startDate || 'current cycle'}`,
    };

    if (database.payments) {
      await paymentsRepo.create(paymentRecord, { allowDuplicate: true }, database);
    }

    const updatedCurrentPeriod = {
      ...(client.currentPeriod || {}),
      additionalPaid: newAdditional,
      totalPaid: newTotalPaid,
      remainingAmount: newRemaining,
      paymentStatus: newStatus,
    };

    await database.clients.update(clientId, {
      additionalPaid: newAdditional,
      totalPaid: newTotalPaid,
      remainingAmount: newRemaining,
      paymentStatus: newStatus,
      currentPeriod: updatedCurrentPeriod,
      updatedAt: now,
    });

    return database.clients.get(clientId);
  },

  /**
   * Start next 1-month period preserving original billing anchor day
   */
  async startNextMonth(clientId, { startDate, monthlyPlanAmount, tokenPaid = 0, notes }, database = db) {
    const client = await database.clients.get(clientId);
    if (!client) throw new Error(`Client with id ${clientId} not found`);

    const now = new Date().toISOString();

    // 1. Archive current period
    const completedPeriod = {
      periodNumber: (client.periods?.length || 0) + 1,
      startDate: client.startDate,
      completionDate: client.completionDate,
      monthlyPlanAmount: client.monthlyPlanAmount,
      tokenPaid: client.tokenPaid || 0,
      additionalPaid: client.additionalPaid || 0,
      totalPaid: (client.tokenPaid || 0) + (client.additionalPaid || 0),
      remainingAmount: client.remainingAmount || 0,
      paymentStatus: client.paymentStatus || 'unpaid',
      packageDescription: client.packageDescription,
      completedAt: now,
    };

    const newPlanAmount = roundMoney(Number(monthlyPlanAmount !== undefined ? monthlyPlanAmount : client.monthlyPlanAmount) || 0);
    const newToken = roundMoney(Number(tokenPaid) || 0);
    const newRemaining = roundMoney(newPlanAmount - newToken);
    const newPaymentStatus = newRemaining === 0 ? 'paid' : newToken > 0 ? 'partially_paid' : 'unpaid';

    // Next period dates using preserved anchor day
    const nextStart = startDate || client.completionDate || now.slice(0, 10);
    const anchorDay = client.billingAnchorDay || new Date(nextStart).getDate() || 1;
    const nextCompletion = getNextBillingDateISO(anchorDay, nextStart, 1).slice(0, 10);

    const newCurrentPeriod = {
      periodNumber: (client.periods?.length || 0) + 2,
      startDate: nextStart,
      completionDate: nextCompletion,
      monthlyPlanAmount: newPlanAmount,
      tokenPaid: newToken,
      additionalPaid: 0,
      totalPaid: newToken,
      remainingAmount: newRemaining,
      paymentStatus: newPaymentStatus,
    };

    await database.clients.update(clientId, {
      monthlyPlanAmount: newPlanAmount,
      tokenPaid: newToken,
      additionalPaid: 0,
      totalPaid: newToken,
      remainingAmount: newRemaining,
      paymentStatus: newPaymentStatus,
      startDate: nextStart,
      completionDate: nextCompletion,
      status: 'active',
      onboardingEmailStatus: 'pending',
      completionEmailStatus: 'pending',
      periods: [...(client.periods || []), completedPeriod],
      currentPeriod: newCurrentPeriod,
      notes: notes !== undefined ? notes : client.notes,
      updatedAt: now,
    });

    if (newToken > 0 && database.payments) {
      await paymentsRepo.create(
        {
          clientId,
          amount: newToken,
          type: 'token',
          status: 'completed',
          paidAt: new Date(nextStart).toISOString(),
          notes: `Token for next month period (${nextStart} to ${nextCompletion})`,
        },
        { allowDuplicate: true },
        database
      );
    }

    return database.clients.get(clientId);
  },
};
