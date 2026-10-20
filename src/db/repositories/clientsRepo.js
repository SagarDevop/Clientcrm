import { db } from '../database.js';
import { generateId, normalizePhone } from '../../utils/id.js';

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

  async create(data, database = db) {
    const now = new Date().toISOString();
    const id = data.id || generateId();
    const record = {
      id,
      name: (data.name || '').trim(),
      phone: (data.phone || '').trim(),
      normalizedPhone: normalizePhone(data.phone),
      businessName: (data.businessName || '').trim(),
      email: (data.email || '').trim().toLowerCase(),
      status: data.status || 'active', // active, paused, archived
      serviceIds: Array.isArray(data.serviceIds) ? data.serviceIds : [],
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
    return database.clients.delete(id);
  },
};
