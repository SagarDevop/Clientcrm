import { db } from '../database.js';
import { generateId } from '../../utils/id.js';
import { PROJECT_TEMPLATES } from '../seedData.js';

export const projectsRepo = {
  async getAll({ clientId, status, serviceId } = {}, database = db) {
    let collection = database.projects.toCollection();

    if (clientId) {
      collection = database.projects.where('clientId').equals(clientId);
    } else if (status) {
      collection = database.projects.where('status').equals(status);
    }

    let projects = await collection.sortBy('createdAt');
    projects.reverse();

    if (clientId && status) {
      projects = projects.filter((p) => p.status === status);
    }

    if (serviceId) {
      projects = projects.filter((p) => Array.isArray(p.serviceIds) && p.serviceIds.includes(serviceId));
    }

    return projects;
  },

  async getById(id, database = db) {
    if (!id) return null;
    return database.projects.get(id);
  },

  async create(data, optionsOrDb = {}, databaseArg = undefined) {
    let templateId = null;
    let database = db;

    if (optionsOrDb && optionsOrDb.projects) {
      database = optionsOrDb;
    } else {
      templateId = optionsOrDb?.templateId || null;
      database = databaseArg || db;
    }

    return database.transaction('rw', [database.projects, database.tasks], async () => {
      const now = new Date().toISOString();
      const id = data.id || generateId();

      const record = {
        id,
        clientId: data.clientId,
        name: (data.name || '').trim(),
        description: (data.description || '').trim(),
        serviceIds: Array.isArray(data.serviceIds) ? data.serviceIds : [],
        status: data.status || 'active',
        startDate: data.startDate || now,
        deadline: data.deadline || null,
        agreedAmount: Number(data.agreedAmount) || 0,
        notes: data.notes || '',
        createdAt: data.createdAt || now,
        updatedAt: now,
        completedAt: data.status === 'completed' ? now : null,
      };

      await database.projects.add(record);

      // If a template was chosen, add template tasks
      if (templateId) {
        const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
        if (template && template.tasks) {
          const tasksToAdd = template.tasks.map((taskTitle, idx) => ({
            id: generateId(),
            clientId: record.clientId,
            projectId: id,
            title: taskTitle,
            description: '',
            category: template.name,
            status: 'todo',
            priority: 'medium',
            dueAt: record.deadline || null,
            completedAt: null,
            recurrence: 'none',
            createdAt: new Date(Date.now() + idx * 100).toISOString(),
            updatedAt: now,
          }));
          await database.tasks.bulkAdd(tasksToAdd);
        }
      }

      return record;
    });
  },

  async update(id, updates, database = db) {
    const existing = await database.projects.get(id);
    if (!existing) throw new Error(`Project with id ${id} not found`);

    const now = new Date().toISOString();
    const cleanUpdates = {
      ...updates,
      updatedAt: now,
    };

    if (updates.name !== undefined) cleanUpdates.name = updates.name.trim();
    if (updates.agreedAmount !== undefined) cleanUpdates.agreedAmount = Number(updates.agreedAmount) || 0;
    if (updates.status === 'completed' && !existing.completedAt) {
      cleanUpdates.completedAt = now;
    } else if (updates.status && updates.status !== 'completed') {
      cleanUpdates.completedAt = null;
    }

    await database.projects.update(id, cleanUpdates);
    return database.projects.get(id);
  },

  async complete(id, database = db) {
    const now = new Date().toISOString();
    await database.projects.update(id, {
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    });
    return database.projects.get(id);
  },

  async getProgress(id, database = db) {
    const tasks = await database.tasks.where('projectId').equals(id).toArray();
    const applicableTasks = tasks.filter((t) => t.status !== 'cancelled');
    const total = applicableTasks.length;
    const completed = applicableTasks.filter((t) => t.status === 'completed').length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      total,
      completed,
      pending: total - completed,
      percentage,
      explanation: `${completed} of ${total} applicable deliverables completed (${percentage}%)`,
    };
  },

  async delete(id, database = db) {
    return database.projects.delete(id);
  },
};
