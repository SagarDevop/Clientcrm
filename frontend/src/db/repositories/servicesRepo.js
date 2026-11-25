import { db } from '../database.js';
import { generateId } from '../../utils/id.js';

export const servicesRepo = {
  async getAll({ activeOnly = false } = {}, database = db) {
    let collection = database.services.toCollection();
    let services = await collection.toArray();

    if (activeOnly) {
      services = services.filter((s) => s.active);
    }

    return services;
  },

  async getById(id, database = db) {
    if (!id) return null;
    return database.services.get(id);
  },

  async create(data, database = db) {
    const now = new Date().toISOString();
    const id = data.id || `srv-${generateId().slice(0, 8)}`;

    const record = {
      id,
      name: (data.name || '').trim(),
      description: (data.description || '').trim(),
      active: data.active !== undefined ? Boolean(data.active) : true,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    await database.services.add(record);
    return record;
  },

  async update(id, updates, database = db) {
    const existing = await database.services.get(id);
    if (!existing) throw new Error(`Service with id ${id} not found`);

    const now = new Date().toISOString();
    const cleanUpdates = {
      ...updates,
      updatedAt: now,
    };

    if (updates.name !== undefined) cleanUpdates.name = updates.name.trim();
    if (updates.description !== undefined) cleanUpdates.description = updates.description.trim();

    await database.services.update(id, cleanUpdates);
    return database.services.get(id);
  },

  async toggleActive(id, database = db) {
    const existing = await database.services.get(id);
    if (!existing) throw new Error(`Service with id ${id} not found`);

    const now = new Date().toISOString();
    const newStatus = !existing.active;
    await database.services.update(id, {
      active: newStatus,
      updatedAt: now,
    });
    return database.services.get(id);
  },

  async delete(id, database = db) {
    return database.services.delete(id);
  },
};
