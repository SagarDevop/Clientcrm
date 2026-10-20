import { db } from '../database.js';
import { generateId } from '../../utils/id.js';

export const interactionsRepo = {
  async getForEntity({ leadId, clientId }, database = db) {
    let collection;
    if (leadId && clientId) {
      // Find where leadId or clientId matches
      const byLead = await database.interactions.where('leadId').equals(leadId).toArray();
      const byClient = await database.interactions.where('clientId').equals(clientId).toArray();
      const map = new Map();
      [...byLead, ...byClient].forEach((item) => map.set(item.id, item));
      const all = Array.from(map.values());
      all.sort((a, b) => new Date(b.occurredAt || b.createdAt) - new Date(a.occurredAt || a.createdAt));
      return all;
    } else if (leadId) {
      collection = database.interactions.where('leadId').equals(leadId);
    } else if (clientId) {
      collection = database.interactions.where('clientId').equals(clientId);
    } else {
      collection = database.interactions.toCollection();
    }

    const items = await collection.sortBy('occurredAt');
    items.reverse();
    return items;
  },

  async getAll({ limit = 50 } = {}, database = db) {
    const items = await database.interactions.orderBy('occurredAt').reverse().limit(limit).toArray();
    return items;
  },

  async getRecent(limit = 10, database = db) {
    return database.interactions.orderBy('occurredAt').reverse().limit(limit).toArray();
  },

  async getCountsByEntity({ leadId, clientId }, database = db) {
    const list = await this.getForEntity({ leadId, clientId }, database);
    return {
      total: list.length,
      calls: list.filter((i) => i.type === 'call').length,
      whatsapp: list.filter((i) => i.type === 'whatsapp').length,
      meetings: list.filter((i) => i.type === 'meeting').length,
      demos: list.filter((i) => i.type === 'demo').length,
      emails: list.filter((i) => i.type === 'email').length,
    };
  },

  async logInteraction(data, database = db) {
    return database.transaction('rw', [database.interactions, database.leads, database.clients, database.reminders], async () => {
      const now = new Date().toISOString();
      const id = data.id || generateId();
      const occurredAt = data.occurredAt || now;

      const record = {
        id,
        leadId: data.leadId || null,
        clientId: data.clientId || null,
        type: data.type || 'call',
        occurredAt,
        durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : null,
        outcome: (data.outcome || '').trim(),
        summary: (data.summary || '').trim(),
        notes: data.notes || '',
        nextFollowUpAt: data.nextFollowUpAt || null,
        createdAt: data.createdAt || now,
        updatedAt: now,
      };

      await database.interactions.add(record);

      // Update lead if leadId is set
      if (data.leadId) {
        const lead = await database.leads.get(data.leadId);
        if (lead) {
          const leadUpdates = {
            lastContactAt: occurredAt,
            updatedAt: now,
          };
          if (data.nextFollowUpAt) {
            leadUpdates.nextFollowUpAt = data.nextFollowUpAt;
          }
          // If stage was fresh, move to contacted
          if (lead.stage === 'fresh') {
            leadUpdates.stage = 'contacted';
          }
          // If type was demo, update demoStatus
          if (data.type === 'demo') {
            leadUpdates.demoStatus = 'sent';
            leadUpdates.demoSentAt = occurredAt;
          }
          await database.leads.update(data.leadId, leadUpdates);
        }
      }

      // Update client if clientId is set
      if (data.clientId) {
        await database.clients.update(data.clientId, {
          updatedAt: now,
        });
      }

      // If next follow-up is scheduled, create or update a reminder
      if (data.nextFollowUpAt) {
        const reminderId = generateId();
        const entityName = data.leadName || data.clientName || 'Contact';
        await database.reminders.add({
          id: reminderId,
          entityType: data.leadId ? 'lead' : 'client',
          entityId: data.leadId || data.clientId,
          title: `Follow up with ${entityName}: ${record.outcome || 'Follow-up'}`,
          scheduledAt: data.nextFollowUpAt,
          status: 'scheduled',
          notifiedAt: null,
          snoozedUntil: null,
          createdAt: now,
          updatedAt: now,
        });
      }

      return record;
    });
  },

  async delete(id, database = db) {
    return database.interactions.delete(id);
  },
};
