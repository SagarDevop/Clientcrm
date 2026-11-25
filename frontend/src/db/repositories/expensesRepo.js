import { db } from '../database.js';
import { generateId } from '../../utils/id.js';
import { roundMoney } from '../../utils/finance.js';

export const expensesRepo = {
  async getAll({ category, projectId, search } = {}, database = db) {
    if (!database.expenses) return [];
    let collection = database.expenses.toCollection();

    if (category) {
      collection = database.expenses.where('category').equals(category);
    } else if (projectId) {
      collection = database.expenses.where('projectId').equals(projectId);
    }

    let expenses = await collection.sortBy('date');
    expenses.reverse(); // newest first

    if (category && projectId) {
      expenses = expenses.filter((e) => e.projectId === projectId);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      expenses = expenses.filter(
        (e) =>
          (e.vendor && e.vendor.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.category && e.category.toLowerCase().includes(q))
      );
    }

    return expenses;
  },

  async getById(id, database = db) {
    if (!id || !database.expenses) return null;
    return database.expenses.get(id);
  },

  async getTotal({ startDate, endDate, category } = {}, database = db) {
    if (!database.expenses) return 0;
    let list = await database.expenses.toArray();

    if (startDate) {
      list = list.filter((e) => e.date >= startDate);
    }
    if (endDate) {
      list = list.filter((e) => e.date <= endDate);
    }
    if (category) {
      list = list.filter((e) => e.category === category);
    }

    const total = list.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return roundMoney(total);
  },

  async create(data, database = db) {
    const now = new Date().toISOString();
    const id = data.id || generateId();

    const record = {
      id,
      date: data.date || now.slice(0, 10),
      category: data.category || 'software', // software, contractor, ads, hosting, domain, office, other
      amount: roundMoney(Number(data.amount) || 0),
      vendor: (data.vendor || '').trim(),
      description: (data.description || data.notes || '').trim(),
      projectId: data.projectId || null,
      paymentMethod: data.paymentMethod || 'bank_transfer',
      receiptUrl: (data.receiptUrl || '').trim(),
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    if (database.expenses) {
      await database.expenses.add(record);
    }
    return record;
  },

  async update(id, updates, database = db) {
    if (!database.expenses) return null;
    const existing = await database.expenses.get(id);
    if (!existing) throw new Error(`Expense with id ${id} not found`);

    const now = new Date().toISOString();
    const cleanUpdates = {
      ...updates,
      updatedAt: now,
    };

    if (updates.amount !== undefined) {
      cleanUpdates.amount = roundMoney(Number(updates.amount) || 0);
    }

    await database.expenses.update(id, cleanUpdates);
    return database.expenses.get(id);
  },

  async delete(id, database = db) {
    if (!database.expenses) return false;
    return database.expenses.delete(id);
  },
};
