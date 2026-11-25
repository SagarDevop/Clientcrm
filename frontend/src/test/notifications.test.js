import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isNotificationSupported,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendLocalNotification,
} from '../services/notifications.js';
import { reminderEngine } from '../services/reminderEngine.js';
import { BizCRMDatabase } from '../db/database.js';
import { leadsRepo } from '../db/repositories/leadsRepo.js';
import { tasksRepo } from '../db/repositories/tasksRepo.js';
import { remindersRepo } from '../db/repositories/remindersRepo.js';

describe('Notification and Reminder Engine', () => {
  let testDb;

  beforeEach(async () => {
    const dbName = `TestNotificationDB_${Math.random().toString(36).substring(7)}`;
    testDb = new BizCRMDatabase(dbName);
    await testDb.open();
  });

  it('detects notification support and handles permission requests', async () => {
    expect(isNotificationSupported()).toBe(true);

    // Mock granted permission
    globalThis.Notification.permission = 'granted';
    expect(getNotificationPermissionStatus()).toBe('granted');

    const res = await requestNotificationPermission();
    expect(res.granted).toBe(true);

    // Mock denied permission
    globalThis.Notification.permission = 'denied';
    expect(getNotificationPermissionStatus()).toBe('denied');
  });

  it('reconciles upcoming lead follow-ups and task deadlines into in-app reminders', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    // Create lead with upcoming follow-up
    await leadsRepo.create(
      {
        name: 'Prospect with follow-up',
        nextFollowUpAt: tomorrow,
        stage: 'contacted',
      },
      testDb
    );

    // Create task with deadline
    await tasksRepo.create(
      {
        title: 'Submit Proposal Draft',
        dueAt: tomorrow,
        status: 'todo',
      },
      testDb
    );

    // Run reconciliation
    await reminderEngine.reconcileReminders(testDb);

    // Verify reminders table was populated
    const scheduled = await remindersRepo.getAll({ status: 'scheduled' }, testDb);
    expect(scheduled.length).toBeGreaterThanOrEqual(2);
  });
});
