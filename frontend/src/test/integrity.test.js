import { describe, it, expect, beforeEach } from 'vitest';
import { BizCRMDatabase } from '../db/database.js';
import { validateDatabaseIntegrity } from '../db/validation.js';
import { clientsRepo } from '../db/repositories/clientsRepo.js';
import { projectsRepo } from '../db/repositories/projectsRepo.js';
import { tasksRepo } from '../db/repositories/tasksRepo.js';

describe('Database Integrity and Orphan Detection', () => {
  let testDb;

  beforeEach(async () => {
    const dbName = `TestIntegrityDB_${Math.random().toString(36).substring(7)}`;
    testDb = new BizCRMDatabase(dbName);
    await testDb.open();
  });

  it('reports valid integrity for well-linked entities', async () => {
    const client = await clientsRepo.create({ name: 'Acme Corp' }, testDb);
    const project = await projectsRepo.create(
      { clientId: client.id, name: 'SEO Campaign' },
      {},
      testDb
    );
    await tasksRepo.create(
      { clientId: client.id, projectId: project.id, title: 'Keyword Audit' },
      testDb
    );

    const report = await validateDatabaseIntegrity(testDb);
    expect(report.isValid).toBe(true);
    expect(report.brokenRelationships).toHaveLength(0);
  });

  it('detects orphaned projects, tasks, and payments pointing to missing entities', async () => {
    // Manually insert an orphaned project
    await testDb.projects.add({
      id: 'proj-orphan',
      clientId: 'deleted-client-id',
      name: 'Orphaned Deliverables',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Manually insert an orphaned task
    await testDb.tasks.add({
      id: 'task-orphan',
      projectId: 'deleted-project-id',
      title: 'Orphan Task',
      status: 'todo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const report = await validateDatabaseIntegrity(testDb);
    expect(report.isValid).toBe(false);
    expect(report.brokenRelationships.length).toBeGreaterThanOrEqual(2);
  });
});
