import { db } from '../database.js';
import { generateId } from '../../utils/id.js';
import { addDays, addWeeks, addMonths, startOfDay, endOfDay, isPast, isToday, parseISO } from 'date-fns';

export const tasksRepo = {
  async getAll({ status, filter, clientId, projectId, priority } = {}, database = db) {
    let tasks = await database.tasks.toArray();

    // Sort by dueAt (earliest first, nulls at bottom)
    tasks.sort((a, b) => {
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt) - new Date(b.dueAt);
    });

    if (clientId) {
      tasks = tasks.filter((t) => t.clientId === clientId);
    }

    if (projectId) {
      tasks = tasks.filter((t) => t.projectId === projectId);
    }

    if (priority) {
      tasks = tasks.filter((t) => t.priority === priority);
    }

    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }

    // Custom view filter
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    if (filter === 'today') {
      tasks = tasks.filter((t) => {
        if (t.status === 'completed' || t.status === 'cancelled') return false;
        if (!t.dueAt) return false;
        const d = parseISO(t.dueAt);
        return isToday(d);
      });
    } else if (filter === 'overdue') {
      tasks = tasks.filter((t) => {
        if (t.status === 'completed' || t.status === 'cancelled') return false;
        if (!t.dueAt) return false;
        const d = parseISO(t.dueAt);
        return d < todayStart;
      });
    } else if (filter === 'upcoming') {
      tasks = tasks.filter((t) => {
        if (t.status === 'completed' || t.status === 'cancelled') return false;
        if (!t.dueAt) return true;
        const d = parseISO(t.dueAt);
        return d > todayEnd;
      });
    } else if (filter === 'completed') {
      tasks = tasks.filter((t) => t.status === 'completed');
    }

    return tasks;
  },

  async getById(id, database = db) {
    if (!id) return null;
    return database.tasks.get(id);
  },

  async create(data, database = db) {
    const now = new Date().toISOString();
    const id = data.id || generateId();

    const record = {
      id,
      clientId: data.clientId || null,
      projectId: data.projectId || null,
      title: (data.title || '').trim(),
      description: data.description || '',
      category: data.category || 'General',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      dueAt: data.dueAt || null,
      completedAt: data.status === 'completed' ? now : null,
      recurrence: data.recurrence || 'none', // none, daily, weekly, monthly
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    await database.tasks.add(record);
    return record;
  },

  async update(id, updates, database = db) {
    const existing = await database.tasks.get(id);
    if (!existing) throw new Error(`Task with id ${id} not found`);

    const now = new Date().toISOString();
    const cleanUpdates = {
      ...updates,
      updatedAt: now,
    };

    if (updates.status === 'completed' && !existing.completedAt) {
      cleanUpdates.completedAt = now;
    } else if (updates.status && updates.status !== 'completed') {
      cleanUpdates.completedAt = null;
    }

    await database.tasks.update(id, cleanUpdates);
    return database.tasks.get(id);
  },

  /**
   * Complete task. If recurring, generates next recurrence with distinct ID to preserve completion history.
   */
  async completeTask(id, database = db) {
    return database.transaction('rw', [database.tasks], async () => {
      const task = await database.tasks.get(id);
      if (!task) throw new Error(`Task ${id} not found`);

      const now = new Date().toISOString();

      // Mark current task completed
      await database.tasks.update(id, {
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      });

      let nextTask = null;
      // Handle recurrence
      if (task.recurrence && task.recurrence !== 'none') {
        const baseDate = task.dueAt ? parseISO(task.dueAt) : new Date();
        let nextDueDate;
        if (task.recurrence === 'daily') {
          nextDueDate = addDays(baseDate, 1);
        } else if (task.recurrence === 'weekly') {
          nextDueDate = addWeeks(baseDate, 1);
        } else if (task.recurrence === 'monthly') {
          nextDueDate = addMonths(baseDate, 1);
        }

        if (nextDueDate) {
          nextTask = {
            id: generateId(),
            clientId: task.clientId,
            projectId: task.projectId,
            title: task.title,
            description: task.description,
            category: task.category,
            status: 'todo',
            priority: task.priority,
            dueAt: nextDueDate.toISOString(),
            completedAt: null,
            recurrence: task.recurrence,
            createdAt: now,
            updatedAt: now,
          };
          await database.tasks.add(nextTask);
        }
      }

      return {
        completedTask: await database.tasks.get(id),
        nextTask,
      };
    });
  },

  async reopenTask(id, database = db) {
    const now = new Date().toISOString();
    await database.tasks.update(id, {
      status: 'todo',
      completedAt: null,
      updatedAt: now,
    });
    return database.tasks.get(id);
  },

  async delete(id, database = db) {
    return database.tasks.delete(id);
  },
};
