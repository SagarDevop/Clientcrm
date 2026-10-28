import { db } from '../database.js';
import { generateId } from '../../utils/id.js';

export const emailJobsRepo = {
  async getAll({ status, limit = 50 } = {}, database = db) {
    if (!database.email_jobs) return [];
    let collection = database.email_jobs.toCollection();

    if (status) {
      collection = database.email_jobs.where('status').equals(status);
    }

    let jobs = await collection.sortBy('createdAt');
    jobs.reverse();
    return jobs.slice(0, limit);
  },

  async getById(id, database = db) {
    if (!id || !database.email_jobs) return null;
    return database.email_jobs.get(id);
  },

  async findByIdempotencyKey(key, database = db) {
    if (!key || !database.email_jobs) return null;
    return database.email_jobs.where('idempotencyKey').equals(key).first();
  },

  async createJob({
    type, // 'invoice_due', 'invoice_overdue', 'renewal_reminder', 'payment_confirmation', 'owner_alert'
    recipientEmail,
    recipientName,
    subject,
    templateData = {},
    idempotencyKey,
  }, database = db) {
    if (!database.email_jobs) return null;

    // Strict idempotency check to guarantee zero duplicate emails
    if (idempotencyKey) {
      const existing = await this.findByIdempotencyKey(idempotencyKey, database);
      if (existing) {
        return existing; // Already queued or processed
      }
    }

    const now = new Date().toISOString();
    const id = generateId();

    const record = {
      id,
      type,
      recipientEmail: (recipientEmail || '').trim().toLowerCase(),
      recipientName: (recipientName || '').trim(),
      subject: (subject || '').trim(),
      templateData,
      idempotencyKey: idempotencyKey || `${type}_${recipientEmail}_${now.slice(0, 10)}_${id}`,
      status: 'queued', // queued, sent, failed, skipped
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: null,
      errorDetails: null,
      createdAt: now,
      updatedAt: now,
    };

    await database.email_jobs.add(record);
    return record;
  },

  async markSent(id, resultMeta = {}, database = db) {
    if (!database.email_jobs) return null;
    const now = new Date().toISOString();
    await database.email_jobs.update(id, {
      status: 'sent',
      lastAttemptAt: now,
      errorDetails: null,
      updatedAt: now,
      meta: resultMeta,
    });
    return database.email_jobs.get(id);
  },

  async markFailed(id, errorMessage, database = db) {
    if (!database.email_jobs) return null;
    const existing = await database.email_jobs.get(id);
    if (!existing) return null;

    const nextAttempts = (existing.attempts || 0) + 1;
    const isTerminal = nextAttempts >= (existing.maxAttempts || 3);
    const now = new Date().toISOString();

    await database.email_jobs.update(id, {
      status: isTerminal ? 'failed' : 'queued',
      attempts: nextAttempts,
      lastAttemptAt: now,
      errorDetails: errorMessage,
      updatedAt: now,
    });
    return database.email_jobs.get(id);
  },

  async retryJob(id, database = db) {
    if (!database.email_jobs) return null;
    const now = new Date().toISOString();
    await database.email_jobs.update(id, {
      status: 'queued',
      errorDetails: null,
      updatedAt: now,
    });
    return database.email_jobs.get(id);
  },
};
