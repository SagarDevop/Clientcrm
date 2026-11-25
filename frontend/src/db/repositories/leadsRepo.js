import { db } from '../database.js';
import { generateId, normalizePhone } from '../../utils/id.js';

export const leadsRepo = {
  async getAll({ stage, serviceId, search, excludeWon = false } = {}, database = db) {
    let collection = database.leads.toCollection();

    if (stage) {
      collection = database.leads.where('stage').equals(stage);
    }

    let leads = await collection.sortBy('createdAt');
    leads.reverse(); // newest first

    if (excludeWon) {
      leads = leads.filter((l) => l.stage !== 'won');
    }

    if (serviceId) {
      leads = leads.filter((l) => Array.isArray(l.serviceIds) && l.serviceIds.includes(serviceId));
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const normQ = normalizePhone(q);
      leads = leads.filter((l) => {
        return (
          (l.name && l.name.toLowerCase().includes(q)) ||
          (l.businessName && l.businessName.toLowerCase().includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q)) ||
          (normQ && l.normalizedPhone && l.normalizedPhone.includes(normQ))
        );
      });
    }

    return leads;
  },

  async getById(id, database = db) {
    if (!id) return null;
    return database.leads.get(id);
  },

  async findDuplicates({ phone, email, name, excludeId }, database = db) {
    const warnings = [];
    const norm = normalizePhone(phone);

    if (norm) {
      const match = await database.leads.where('normalizedPhone').equals(norm).first();
      if (match && match.id !== excludeId) {
        warnings.push({
          field: 'phone',
          message: `Another lead "${match.name}" has this phone number (${match.phone}).`,
          existing: match,
        });
      }
    }

    if (email && email.trim()) {
      const match = await database.leads.where('email').equalsIgnoreCase(email.trim()).first();
      if (match && match.id !== excludeId) {
        warnings.push({
          field: 'email',
          message: `Another lead "${match.name}" has this email address (${match.email}).`,
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
      stage: data.stage || 'fresh',
      serviceIds: Array.isArray(data.serviceIds) ? data.serviceIds : [],
      source: (data.source || '').trim(),
      estimatedValue: Number(data.estimatedValue) || 0,
      quotationAmount: Number(data.quotationAmount) || 0,
      demoStatus: data.demoStatus || 'not_sent',
      demoSentAt: data.demoSentAt || null,
      lastContactAt: data.lastContactAt || null,
      nextFollowUpAt: data.nextFollowUpAt || null,
      wonClientId: data.wonClientId || null,
      lostReason: data.lostReason || null,
      notes: data.notes || '',
      createdAt: data.createdAt || now,
      updatedAt: now,
      archivedAt: null,
    };

    await database.leads.add(record);
    return record;
  },

  async update(id, updates, database = db) {
    const existing = await database.leads.get(id);
    if (!existing) throw new Error(`Lead with id ${id} not found`);

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
    if (updates.estimatedValue !== undefined) cleanUpdates.estimatedValue = Number(updates.estimatedValue) || 0;
    if (updates.quotationAmount !== undefined) cleanUpdates.quotationAmount = Number(updates.quotationAmount) || 0;

    await database.leads.update(id, cleanUpdates);
    return database.leads.get(id);
  },

  async markLost(id, reason, database = db) {
    const now = new Date().toISOString();
    await database.leads.update(id, {
      stage: 'lost',
      lostReason: (reason || '').trim(),
      updatedAt: now,
    });
    return database.leads.get(id);
  },

  async reopen(id, database = db) {
    const now = new Date().toISOString();
    await database.leads.update(id, {
      stage: 'fresh',
      lostReason: null,
      updatedAt: now,
    });
    return database.leads.get(id);
  },

  /**
   * Converts a lead into a client inside an atomic transaction.
   * Preserves interaction history and optionally creates the first project.
   */
  async convertToClient(leadId, { projectName, agreedAmount, deadline, initialTasks = [] } = {}, database = db) {
    return database.transaction('rw', [database.leads, database.clients, database.interactions, database.projects, database.tasks, database.reminders], async () => {
      const lead = await database.leads.get(leadId);
      if (!lead) throw new Error(`Lead ${leadId} not found`);

      const now = new Date().toISOString();

      // Check if client already created for this lead
      let clientId = lead.wonClientId;
      let client = clientId ? await database.clients.get(clientId) : null;

      if (!client) {
        clientId = generateId();
        client = {
          id: clientId,
          name: lead.name,
          phone: lead.phone,
          normalizedPhone: lead.normalizedPhone,
          businessName: lead.businessName,
          email: lead.email,
          status: 'active',
          serviceIds: lead.serviceIds || [],
          source: lead.source,
          notes: `Converted from lead on ${new Date().toLocaleDateString()}.\n\nLead notes: ${lead.notes || ''}`,
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        };
        await database.clients.add(client);
      }

      // Update lead to 'won' and link to client
      await database.leads.update(leadId, {
        stage: 'won',
        wonClientId: clientId,
        updatedAt: now,
      });

      // Update interactions to link to client as well, preserving history
      const interactions = await database.interactions.where('leadId').equals(leadId).toArray();
      for (const inter of interactions) {
        await database.interactions.update(inter.id, {
          clientId: clientId,
          updatedAt: now,
        });
      }

      // Re-link or create reminders if needed
      const reminders = await database.reminders.where('entityId').equals(leadId).toArray();
      for (const rem of reminders) {
        await database.reminders.update(rem.id, {
          entityType: 'client',
          entityId: clientId,
          updatedAt: now,
        });
      }

      // Optionally create project
      let project = null;
      if (projectName && projectName.trim()) {
        const projectId = generateId();
        project = {
          id: projectId,
          clientId: clientId,
          name: projectName.trim(),
          description: `Initial project converted from lead ${lead.name}`,
          serviceIds: lead.serviceIds || [],
          status: 'active',
          startDate: now,
          deadline: deadline || null,
          agreedAmount: Number(agreedAmount) || Number(lead.quotationAmount) || Number(lead.estimatedValue) || 0,
          notes: '',
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        };
        await database.projects.add(project);

        // Add starter checklist tasks if provided
        if (Array.isArray(initialTasks) && initialTasks.length > 0) {
          const taskRecords = initialTasks.map((taskTitle, idx) => ({
            id: generateId(),
            clientId: clientId,
            projectId: projectId,
            title: typeof taskTitle === 'string' ? taskTitle : taskTitle.title,
            description: '',
            category: 'Project Deliverable',
            status: 'todo',
            priority: 'medium',
            dueAt: deadline || null,
            completedAt: null,
            recurrence: 'none',
            createdAt: new Date(Date.now() + idx * 100).toISOString(),
            updatedAt: now,
          }));
          await database.tasks.bulkAdd(taskRecords);
        }
      }

      return {
        client,
        lead: await database.leads.get(leadId),
        project,
      };
    });
  },

  async delete(id, database = db) {
    return database.leads.delete(id);
  },
};
