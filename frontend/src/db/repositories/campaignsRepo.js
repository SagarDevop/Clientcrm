import { db } from '../database.js';
import { generateId } from '../../utils/id.js';
import { roundMoney } from '../../utils/finance.js';

export const campaignsRepo = {
  async getAll({ clientId, status } = {}, database = db) {
    if (!database.campaigns) return [];
    let collection = database.campaigns.toCollection();

    if (clientId) {
      collection = database.campaigns.where('clientId').equals(clientId);
    } else if (status) {
      collection = database.campaigns.where('status').equals(status);
    }

    let campaigns = await collection.sortBy('startDate');
    campaigns.reverse();

    if (clientId && status) {
      campaigns = campaigns.filter((c) => c.status === status);
    }
    return campaigns;
  },

  async getById(id, database = db) {
    if (!id || !database.campaigns) return null;
    return database.campaigns.get(id);
  },

  async create(data, database = db) {
    const now = new Date().toISOString();
    const id = data.id || generateId();

    const record = {
      id,
      clientId: data.clientId,
      clientName: (data.clientName || '').trim(),
      name: (data.name || '').trim(),
      platform: data.platform || 'meta', // meta, google, linkedin, other
      status: data.status || 'active', // planning, active, completed, paused
      startDate: data.startDate || now.slice(0, 10),
      endDate: data.endDate || null,
      managementFee: roundMoney(Number(data.managementFee) || 0),
      clientBudget: roundMoney(Number(data.clientBudget) || 0),
      recordedSpend: roundMoney(Number(data.recordedSpend) || 0),
      leadsGenerated: Number(data.leadsGenerated) || 0,
      roas: Number(data.roas) || 0,
      notes: data.notes || '',
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    if (database.campaigns) {
      await database.campaigns.add(record);
    }
    return record;
  },

  async update(id, updates, database = db) {
    if (!database.campaigns) return null;
    const existing = await database.campaigns.get(id);
    if (!existing) throw new Error(`Campaign ${id} not found`);

    const now = new Date().toISOString();
    const cleanUpdates = {
      ...updates,
      updatedAt: now,
    };

    if (updates.managementFee !== undefined) cleanUpdates.managementFee = roundMoney(Number(updates.managementFee) || 0);
    if (updates.clientBudget !== undefined) cleanUpdates.clientBudget = roundMoney(Number(updates.clientBudget) || 0);
    if (updates.recordedSpend !== undefined) cleanUpdates.recordedSpend = roundMoney(Number(updates.recordedSpend) || 0);

    await database.campaigns.update(id, cleanUpdates);
    return database.campaigns.get(id);
  },

  async delete(id, database = db) {
    if (!database.campaigns) return false;
    return database.campaigns.delete(id);
  },
};
