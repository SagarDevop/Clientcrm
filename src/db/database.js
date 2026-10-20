import Dexie from 'dexie';
import { DEFAULT_SERVICES } from './seedData.js';

export class BizCRMDatabase extends Dexie {
  constructor(dbName = 'BizCRM_Database') {
    super(dbName);

    // Schema Version 1
    this.version(1).stores({
      clients: 'id, name, phone, normalizedPhone, businessName, email, status, *serviceIds, createdAt, updatedAt, archivedAt',
      leads: 'id, name, phone, normalizedPhone, businessName, email, stage, *serviceIds, nextFollowUpAt, lastContactAt, wonClientId, createdAt, updatedAt, archivedAt',
      interactions: 'id, leadId, clientId, type, occurredAt, nextFollowUpAt, createdAt',
      projects: 'id, clientId, status, *serviceIds, deadline, createdAt, updatedAt, completedAt',
      tasks: 'id, clientId, projectId, status, priority, dueAt, completedAt, recurrence, createdAt',
      payments: 'id, clientId, projectId, type, status, paidAt, createdAt',
      services: 'id, name, active, createdAt',
      reminders: 'id, entityType, entityId, scheduledAt, status, snoozedUntil, createdAt',
      settings: 'key',
    });

    // Populate hook for initial seed
    this.on('populate', () => {
      const now = new Date().toISOString();
      const servicesWithTimestamps = DEFAULT_SERVICES.map((s) => ({
        ...s,
        createdAt: now,
        updatedAt: now,
      }));
      this.services.bulkAdd(servicesWithTimestamps);

      // Default app settings
      this.settings.bulkAdd([
        { key: 'theme', value: 'system', updatedAt: now },
        { key: 'currency', value: 'USD', updatedAt: now },
        { key: 'defaultFollowUpDays', value: 3, updatedAt: now },
        { key: 'notificationsEnabled', value: false, updatedAt: now },
        { key: 'reminderNoticeMinutes', value: 15, updatedAt: now },
      ]);
    });
  }
}

export const db = new BizCRMDatabase();

/**
 * Ensures services and default settings are seeded even if db was created before populate hook
 */
export async function ensureDbSeeded(database = db) {
  const serviceCount = await database.services.count();
  const now = new Date().toISOString();

  if (serviceCount === 0) {
    const servicesWithTimestamps = DEFAULT_SERVICES.map((s) => ({
      ...s,
      createdAt: now,
      updatedAt: now,
    }));
    await database.services.bulkAdd(servicesWithTimestamps);
  }

  const themeSetting = await database.settings.get('theme');
  if (!themeSetting) {
    await database.settings.bulkAdd([
      { key: 'theme', value: 'system', updatedAt: now },
      { key: 'currency', value: 'USD', updatedAt: now },
      { key: 'defaultFollowUpDays', value: 3, updatedAt: now },
      { key: 'notificationsEnabled', value: false, updatedAt: now },
      { key: 'reminderNoticeMinutes', value: 15, updatedAt: now },
    ]);
  }
}
