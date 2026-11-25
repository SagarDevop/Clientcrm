import { describe, it, expect, beforeEach } from 'vitest';
import { BizCRMDatabase } from '../db/database.js';
import { clientsRepo } from '../db/repositories/clientsRepo.js';
import { leadsRepo } from '../db/repositories/leadsRepo.js';
import { interactionsRepo } from '../db/repositories/interactionsRepo.js';
import { projectsRepo } from '../db/repositories/projectsRepo.js';
import { tasksRepo } from '../db/repositories/tasksRepo.js';
import { paymentsRepo } from '../db/repositories/paymentsRepo.js';
import { remindersRepo } from '../db/repositories/remindersRepo.js';
import { servicesRepo } from '../db/repositories/servicesRepo.js';

describe('IndexedDB Core Operations and Business Rules', () => {
  let testDb;

  beforeEach(async () => {
    // Unique test database per test case
    const dbName = `TestDB_${Math.random().toString(36).substring(7)}`;
    testDb = new BizCRMDatabase(dbName);
    await testDb.open();
  });

  it('creates and updates clients with multi-service selection and normalized phone', async () => {
    const client = await clientsRepo.create(
      {
        name: 'Sarah Connor',
        phone: '+1 (555) 234-5678',
        businessName: 'Cyberdyne Defense',
        email: 'sarah@cyberdyne.com',
        serviceIds: ['srv-website', 'srv-meta-ads'],
      },
      testDb
    );

    expect(client.id).toBeDefined();
    expect(client.normalizedPhone).toBe('+15552345678');
    expect(client.serviceIds).toHaveLength(2);
    expect(client.status).toBe('active');

    // Update
    const updated = await clientsRepo.update(
      client.id,
      {
        businessName: 'Cyberdyne Global',
        serviceIds: ['srv-website', 'srv-meta-ads', 'srv-ai-ads'],
      },
      testDb
    );

    expect(updated.businessName).toBe('Cyberdyne Global');
    expect(updated.serviceIds).toHaveLength(3);
  });

  it('detects duplicate client records without preventing shared phone numbers', async () => {
    await clientsRepo.create(
      {
        name: 'John Miller',
        phone: '123-456-7890',
        email: 'john@example.com',
      },
      testDb
    );

    const warnings = await clientsRepo.findDuplicates(
      {
        phone: '(123) 456-7890',
        email: 'different@example.com',
        name: 'Another Person',
      },
      testDb
    );

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].field).toBe('phone');
  });

  it('tracks lead stages, estimations, and logs interactions atomically', async () => {
    const lead = await leadsRepo.create(
      {
        name: 'Alex Murphy',
        phone: '555-0101',
        stage: 'fresh',
        estimatedValue: 5000,
        quotationAmount: 4500,
      },
      testDb
    );

    expect(lead.stage).toBe('fresh');

    // Log call interaction
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const interaction = await interactionsRepo.logInteraction(
      {
        leadId: lead.id,
        leadName: lead.name,
        type: 'call',
        durationMinutes: 20,
        outcome: 'Demo Scheduled',
        summary: 'Walked through PWA architecture and timeline.',
        nextFollowUpAt: tomorrow,
      },
      testDb
    );

    expect(interaction.id).toBeDefined();

    // Check that lead was transitioned to contacted and nextFollowUpAt was recorded
    const updatedLead = await leadsRepo.getById(lead.id, testDb);
    expect(updatedLead.stage).toBe('contacted');
    expect(updatedLead.lastContactAt).toBeDefined();
    expect(updatedLead.nextFollowUpAt).toBe(tomorrow);

    // Check interaction counts derivation
    const counts = await interactionsRepo.getCountsByEntity({ leadId: lead.id }, testDb);
    expect(counts.total).toBe(1);
    expect(counts.calls).toBe(1);
  });

  it('converts won lead to client atomically preserving history and creates project with deliverables', async () => {
    const lead = await leadsRepo.create(
      {
        name: 'Wayne Enterprises',
        phone: '555-0999',
        businessName: 'Wayne Corp',
        stage: 'negotiation',
        quotationAmount: 12000,
        serviceIds: ['srv-web-app'],
      },
      testDb
    );

    // Log preliminary interaction
    await interactionsRepo.logInteraction(
      {
        leadId: lead.id,
        type: 'meeting',
        outcome: 'Agreement reached',
        summary: 'Final contract approved.',
      },
      testDb
    );

    // Convert to client
    const conversion = await leadsRepo.convertToClient(
      lead.id,
      {
        projectName: 'Enterprise Portal Build',
        agreedAmount: 12000,
        deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
        initialTasks: ['Architecture Spec', 'UI Design', 'Frontend Implementation'],
      },
      testDb
    );

    expect(conversion.client).toBeDefined();
    expect(conversion.client.name).toBe('Wayne Enterprises');
    expect(conversion.lead.stage).toBe('won');
    expect(conversion.lead.wonClientId).toBe(conversion.client.id);

    // Verify interaction was relinked to client
    const clientInteractions = await interactionsRepo.getForEntity(
      { clientId: conversion.client.id },
      testDb
    );
    expect(clientInteractions.length).toBe(1);

    // Verify project and tasks were created
    expect(conversion.project).toBeDefined();
    expect(conversion.project.agreedAmount).toBe(12000);

    const projectTasks = await tasksRepo.getAll({ projectId: conversion.project.id }, testDb);
    expect(projectTasks.length).toBe(3);
  });

  it('completes recurring tasks by creating the next recurrence without overwriting history', async () => {
    const today = new Date().toISOString();
    const task = await tasksRepo.create(
      {
        title: 'Weekly Social Media Batch Post',
        dueAt: today,
        recurrence: 'weekly',
        priority: 'high',
      },
      testDb
    );

    const result = await tasksRepo.completeTask(task.id, testDb);

    // Completed task has completed status and completedAt
    expect(result.completedTask.status).toBe('completed');
    expect(result.completedTask.completedAt).toBeDefined();

    // Next recurrence task was generated with a fresh ID
    expect(result.nextTask).toBeDefined();
    expect(result.nextTask.id).not.toBe(task.id);
    expect(result.nextTask.status).toBe('todo');
    expect(result.nextTask.recurrence).toBe('weekly');
    expect(new Date(result.nextTask.dueAt).getTime()).toBeGreaterThan(new Date(today).getTime());

    // Both records exist in the database
    const allTasks = await tasksRepo.getAll({}, testDb);
    expect(allTasks.length).toBe(2);
  });

  it('calculates payment ledger balances, refunds, and excludes voided transactions', async () => {
    const client = await clientsRepo.create({ name: 'Stark Industries' }, testDb);
    const project = await projectsRepo.create(
      {
        clientId: client.id,
        name: 'AI Automation System',
        agreedAmount: 10000,
      },
      {},
      testDb
    );

    // Initial deposit: 4000
    await paymentsRepo.create(
      {
        clientId: client.id,
        projectId: project.id,
        type: 'payment',
        amount: 4000,
        status: 'recorded',
      },
      testDb
    );

    // Second milestone payment: 3000
    const payment2 = await paymentsRepo.create(
      {
        clientId: client.id,
        projectId: project.id,
        type: 'payment',
        amount: 3000,
        status: 'recorded',
      },
      testDb
    );

    // Refund: 500
    await paymentsRepo.create(
      {
        clientId: client.id,
        projectId: project.id,
        type: 'refund',
        amount: 500,
        status: 'recorded',
      },
      testDb
    );

    // Void transaction: 2000
    const voided = await paymentsRepo.create(
      {
        clientId: client.id,
        projectId: project.id,
        type: 'payment',
        amount: 2000,
        status: 'recorded',
      },
      testDb
    );
    await paymentsRepo.voidTransaction(voided.id, 'Bounced check', testDb);

    // Summary calculation
    const summary = await paymentsRepo.getFinancialSummary(
      { clientId: client.id, projectId: project.id },
      testDb
    );

    // Agreed: 10000
    // Net Received: 4000 + 3000 - 500 = 6500 (voided 2000 is excluded)
    // Outstanding: 10000 - 6500 = 3500
    expect(summary.agreedAmount).toBe(10000);
    expect(summary.netReceived).toBe(6500);
    expect(summary.outstanding).toBe(3500);
    expect(summary.voidedAmount).toBe(2000);
  });

  it('deduplicates and snoozes reminders correctly', async () => {
    const scheduledAt = new Date(Date.now() + 3600000).toISOString();

    const r1 = await remindersRepo.deduplicateOrSchedule(
      {
        entityType: 'lead',
        entityId: 'lead-123',
        title: 'Follow up',
        scheduledAt,
      },
      testDb
    );

    // Try adding duplicate
    const r2 = await remindersRepo.deduplicateOrSchedule(
      {
        entityType: 'lead',
        entityId: 'lead-123',
        title: 'Follow up',
        scheduledAt,
      },
      testDb
    );

    expect(r1.id).toBe(r2.id);

    // Snooze reminder by 60 minutes
    const snoozed = await remindersRepo.snooze(r1.id, 60, testDb);
    expect(snoozed.snoozedUntil).toBeDefined();
    expect(new Date(snoozed.snoozedUntil).getTime()).toBeGreaterThan(Date.now());
  });

  it('manages service active and custom services', async () => {
    const srv = await servicesRepo.create(
      {
        name: 'Influencer Marketing',
        description: 'Brand deals and influencer sourcing',
        active: true,
      },
      testDb
    );

    expect(srv.id).toBeDefined();

    const toggled = await servicesRepo.toggleActive(srv.id, testDb);
    expect(toggled.active).toBe(false);

    const activeList = await servicesRepo.getAll({ activeOnly: true }, testDb);
    expect(activeList.find((s) => s.id === srv.id)).toBeUndefined();
  });
});
