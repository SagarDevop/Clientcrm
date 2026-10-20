import { db } from '../database.js';
import { generateId } from '../../utils/id.js';
import { addMinutes, isPast, parseISO } from 'date-fns';

export const remindersRepo = {
  async getAll({ status, entityType, entityId } = {}, database = db) {
    let collection = database.reminders.toCollection();

    if (status) {
      collection = database.reminders.where('status').equals(status);
    }

    let items = await collection.sortBy('scheduledAt');

    if (entityType) {
      items = items.filter((r) => r.entityType === entityType);
    }
    if (entityId) {
      items = items.filter((r) => r.entityId === entityId);
    }

    return items;
  },

  async getDueReminders(database = db) {
    const now = new Date();
    const scheduled = await database.reminders.where('status').equals('scheduled').toArray();

    return scheduled.filter((r) => {
      const targetTime = r.snoozedUntil ? parseISO(r.snoozedUntil) : parseISO(r.scheduledAt);
      return isPast(targetTime);
    });
  },

  async create(data, database = db) {
    const now = new Date().toISOString();
    const id = data.id || generateId();

    const record = {
      id,
      entityType: data.entityType || 'lead',
      entityId: data.entityId,
      title: (data.title || '').trim(),
      scheduledAt: data.scheduledAt || now,
      status: data.status || 'scheduled',
      notifiedAt: data.notifiedAt || null,
      snoozedUntil: data.snoozedUntil || null,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    await database.reminders.add(record);
    return record;
  },

  /**
   * Prevents creating duplicate active reminders for the same entity and approximate time
   */
  async deduplicateOrSchedule(data, database = db) {
    const existing = await database.reminders
      .where('entityId')
      .equals(data.entityId)
      .toArray();

    const activeExisting = existing.find(
      (r) =>
        r.status === 'scheduled' &&
        r.entityType === data.entityType &&
        Math.abs(new Date(r.scheduledAt) - new Date(data.scheduledAt)) < 5 * 60 * 1000 // within 5 mins
    );

    if (activeExisting) {
      return activeExisting;
    }

    return this.create(data, database);
  },

  async complete(id, database = db) {
    const now = new Date().toISOString();
    await database.reminders.update(id, {
      status: 'completed',
      updatedAt: now,
    });
    return database.reminders.get(id);
  },

  async dismiss(id, database = db) {
    const now = new Date().toISOString();
    await database.reminders.update(id, {
      status: 'dismissed',
      updatedAt: now,
    });
    return database.reminders.get(id);
  },

  async snooze(id, minutes = 30, database = db) {
    const now = new Date();
    const snoozedUntil = addMinutes(now, minutes).toISOString();

    await database.reminders.update(id, {
      status: 'scheduled',
      snoozedUntil,
      updatedAt: now.toISOString(),
    });
    return database.reminders.get(id);
  },

  async markNotified(id, database = db) {
    const now = new Date().toISOString();
    await database.reminders.update(id, {
      notifiedAt: now,
      updatedAt: now,
    });
    return database.reminders.get(id);
  },

  async delete(id, database = db) {
    return database.reminders.delete(id);
  },
};
