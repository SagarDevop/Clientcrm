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

    // Schema Version 2 — Complete Agency Management Suite
    this.version(2)
      .stores({
        clients:
          'id, name, phone, normalizedPhone, businessName, email, status, category, *serviceIds, nextRenewalDate, createdAt, updatedAt, archivedAt',
        leads:
          'id, name, phone, normalizedPhone, businessName, email, stage, *serviceIds, nextFollowUpAt, lastContactAt, wonClientId, createdAt, updatedAt, archivedAt',
        interactions: 'id, leadId, clientId, type, occurredAt, nextFollowUpAt, createdAt',
        projects: 'id, clientId, status, *serviceIds, deadline, createdAt, updatedAt, completedAt',
        tasks:
          'id, clientId, projectId, contentItemId, status, priority, dueAt, completedAt, recurrence, createdAt',
        payments: 'id, clientId, projectId, invoiceId, type, status, paidAt, createdAt',
        services: 'id, name, active, createdAt',
        reminders: 'id, entityType, entityId, scheduledAt, status, snoozedUntil, createdAt',
        settings: 'key',
        invoices:
          'id, invoiceNumber, clientId, projectId, subscriptionId, issueDate, dueDate, status, createdAt, updatedAt',
        subscriptions:
          'id, clientId, name, billingFrequency, anchorDay, nextInvoiceDate, nextRenewalDate, status, createdAt, updatedAt',
        milestones: 'id, projectId, title, plannedDate, status, invoiceId, isPaid, createdAt',
        content_items:
          'id, clientId, channel, contentType, scheduledDate, internalStatus, clientApprovalStatus, createdAt, updatedAt',
        campaigns: 'id, clientId, name, platform, startDate, endDate, status, createdAt, updatedAt',
        expenses: 'id, category, vendor, expenseDate, projectId, clientId, createdAt',
        email_jobs:
          'id, recipientEmail, templateType, entityType, entityId, scheduledFor, status, idempotencyKey, createdAt',
      })
      .upgrade(async (tx) => {
        // Non-destructive upgrade hook: ensure backwards compatibility with v1
        await tx
          .table('clients')
          .toCollection()
          .modify((client) => {
            if (!client.category) client.category = 'both';
            if (!client.paymentTerms) client.paymentTerms = 'net_15';
            if (!client.monthlyRetainer) client.monthlyRetainer = 0;
          });

        await tx
          .table('payments')
          .toCollection()
          .modify((payment) => {
            if (payment.invoiceId === undefined) payment.invoiceId = null;
          });
      });

    // Schema Version 3 — Web Development Client Workflow & Quotations
    this.version(3)
      .stores({
        clients:
          'id, name, phone, normalizedPhone, businessName, email, status, category, clientType, *serviceIds, nextRenewalDate, createdAt, updatedAt, archivedAt',
        projects:
          'id, clientId, status, *serviceIds, deadline, startDate, createdAt, updatedAt, completedAt',
        quotations:
          'id, quotationNumber, clientId, projectId, status, issueDate, validUntil, createdAt, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('clients')
          .toCollection()
          .modify((client) => {
            if (!client.clientType) {
              client.clientType = client.category === 'web_dev' ? 'web_development' : 'content_management';
            }
          });
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
        { key: 'appLockEnabled', value: false, updatedAt: now },
        { key: 'appLockPinHash', value: null, updatedAt: now },
        { key: 'appLockSalt', value: null, updatedAt: now },
        { key: 'defaultTimezone', value: 'Asia/Kolkata', updatedAt: now },
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
      { key: 'appLockEnabled', value: false, updatedAt: now },
      { key: 'appLockPinHash', value: null, updatedAt: now },
      { key: 'appLockSalt', value: null, updatedAt: now },
      { key: 'defaultTimezone', value: 'Asia/Kolkata', updatedAt: now },
    ]);
  } else {
    // Add missing v2 keys if not present
    const appLockSetting = await database.settings.get('appLockEnabled');
    if (!appLockSetting) {
      await database.settings.bulkPut([
        { key: 'appLockEnabled', value: false, updatedAt: now },
        { key: 'appLockPinHash', value: null, updatedAt: now },
        { key: 'appLockSalt', value: null, updatedAt: now },
        { key: 'defaultTimezone', value: 'Asia/Kolkata', updatedAt: now },
      ]);
    }
  }
}
