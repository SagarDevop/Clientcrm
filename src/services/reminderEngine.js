import { db } from '../db/database.js';
import { remindersRepo } from '../db/repositories/remindersRepo.js';
import { sendLocalNotification } from './notifications.js';
import { isPast, parseISO, startOfDay, endOfDay } from 'date-fns';

let engineIntervalId = null;

export const reminderEngine = {
  /**
   * Starts the in-app reminder scheduler loop and visibility listeners
   */
  start() {
    this.stop();
    this.reconcileReminders();

    // Check every 60 seconds while app is foregrounded
    engineIntervalId = setInterval(() => {
      this.checkDueReminders();
    }, 60000);

    // Reconcile immediately when window becomes visible or receives focus
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('focus', this.handleFocus);
    }
  },

  stop() {
    if (engineIntervalId) {
      clearInterval(engineIntervalId);
      engineIntervalId = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('focus', this.handleFocus);
    }
  },

  handleVisibilityChange: () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      reminderEngine.reconcileReminders();
    }
  },

  handleFocus: () => {
    reminderEngine.reconcileReminders();
  },

  /**
   * Scans IndexedDB to synchronize reminders with upcoming lead follow-ups & tasks
   */
  async reconcileReminders(database = db) {
    try {
      const now = new Date();
      const nowIso = now.toISOString();

      // 1. Sync Lead follow-ups
      const leadsWithFollowUp = await database.leads
        .where('stage')
        .noneOf(['won', 'lost'])
        .toArray();

      for (const lead of leadsWithFollowUp) {
        if (lead.nextFollowUpAt) {
          const followUpTime = parseISO(lead.nextFollowUpAt);
          // Only create reminder if not already done
          await remindersRepo.deduplicateOrSchedule(
            {
              entityType: 'lead',
              entityId: lead.id,
              title: `Follow up with ${lead.name} (${lead.businessName || 'Lead'})`,
              scheduledAt: lead.nextFollowUpAt,
            },
            database
          );
        }
      }

      // 2. Sync Task deadlines
      const pendingTasks = await database.tasks
        .where('status')
        .anyOf(['todo', 'in_progress', 'waiting'])
        .toArray();

      for (const task of pendingTasks) {
        if (task.dueAt) {
          await remindersRepo.deduplicateOrSchedule(
            {
              entityType: 'task',
              entityId: task.id,
              title: `Task due: ${task.title}`,
              scheduledAt: task.dueAt,
            },
            database
          );
        }
      }

      // Check due reminders right now
      await this.checkDueReminders(database);
    } catch (err) {
      console.warn('Error in reminder reconciliation:', err);
    }
  },

  /**
   * Fires notifications for reminders that have matured and have not been notified
   */
  async checkDueReminders(database = db) {
    try {
      const dueReminders = await remindersRepo.getDueReminders(database);

      for (const rem of dueReminders) {
        if (!rem.notifiedAt) {
          await sendLocalNotification(rem.title, {
            body: `Scheduled reminder is due!`,
            tag: `rem-${rem.id}`,
            data: {
              entityType: rem.entityType,
              entityId: rem.entityId,
            },
          });

          await remindersRepo.markNotified(rem.id, database);
        }
      }
    } catch (err) {
      console.warn('Error checking due reminders:', err);
    }
  },
};
