import { db } from '../database.js';

export const settingsRepo = {
  async get(key, defaultValue = null, database = db) {
    const record = await database.settings.get(key);
    return record ? record.value : defaultValue;
  },

  async set(key, value, database = db) {
    const now = new Date().toISOString();
    await database.settings.put({
      key,
      value,
      updatedAt: now,
    });
    return value;
  },

  async getAll(database = db) {
    const records = await database.settings.toArray();
    const map = {};
    for (const r of records) {
      map[r.key] = r.value;
    }
    return map;
  },

  async delete(key, database = db) {
    return database.settings.delete(key);
  },
};
