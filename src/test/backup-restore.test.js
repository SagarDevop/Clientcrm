import { describe, it, expect, beforeEach } from 'vitest';
import { BizCRMDatabase } from '../db/database.js';
import {
  exportDatabaseToJson,
  validateBackupJson,
  restoreBackup,
  resetAllData,
} from '../db/backup.js';
import { clientsRepo } from '../db/repositories/clientsRepo.js';
import { leadsRepo } from '../db/repositories/leadsRepo.js';
import { projectsRepo } from '../db/repositories/projectsRepo.js';

describe('JSON Backup, Validation, and Restore Engine', () => {
  let testDb;

  beforeEach(async () => {
    const dbName = `TestBackupDB_${Math.random().toString(36).substring(7)}`;
    testDb = new BizCRMDatabase(dbName);
    await testDb.open();
  });

  it('exports all database collections with accurate structure and counts', async () => {
    await clientsRepo.create({ name: 'Export Test Client' }, testDb);
    await leadsRepo.create({ name: 'Export Test Lead' }, testDb);

    const exported = await exportDatabaseToJson(testDb);

    expect(exported.app).toBe('BizCRM');
    expect(exported.version).toBe(1);
    expect(exported.recordCounts.clients).toBe(1);
    expect(exported.recordCounts.leads).toBe(1);
    expect(exported.data.clients).toHaveLength(1);
    expect(exported.data.leads).toHaveLength(1);
  });

  it('rejects corrupt, non-JSON, and structurally invalid backups', async () => {
    // Non-JSON string
    const res1 = await validateBackupJson('this is not json { [', testDb);
    expect(res1.isValid).toBe(false);
    expect(res1.errors.length).toBeGreaterThan(0);

    // Missing data payload
    const res2 = await validateBackupJson(JSON.stringify({ app: 'BizCRM', version: 1 }), testDb);
    expect(res2.isValid).toBe(false);

    // Missing table arrays
    const res3 = await validateBackupJson(
      JSON.stringify({
        app: 'BizCRM',
        version: 1,
        data: { clients: 'not-an-array' },
      }),
      testDb
    );
    expect(res3.isValid).toBe(false);
  });

  it('detects broken cross-entity references inside the backup preview', async () => {
    const corruptBackup = {
      app: 'BizCRM',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        clients: [],
        leads: [],
        interactions: [],
        projects: [
          {
            id: 'proj-1',
            clientId: 'non-existent-client-id',
            name: 'Orphan Project',
            agreedAmount: 5000,
          },
        ],
        tasks: [],
        payments: [],
        services: [],
      },
    };

    const res = await validateBackupJson(corruptBackup, testDb);
    expect(res.isValid).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings[0]).toContain('cross-entity references');
  });

  it('restores backup with merge and replace strategies inside atomic transactions', async () => {
    // Existing client
    await clientsRepo.create({ id: 'c-existing', name: 'Original Client' }, testDb);

    const backupPayload = {
      app: 'BizCRM',
      version: 1,
      data: {
        clients: [{ id: 'c-restored', name: 'Restored Client', status: 'active', createdAt: new Date().toISOString() }],
        leads: [],
        interactions: [],
        projects: [],
        tasks: [],
        payments: [],
        services: [],
        reminders: [],
      },
    };

    // Strategy: Merge -> both c-existing and c-restored should exist
    await restoreBackup(backupPayload, 'merge', testDb);
    let clients = await testDb.clients.toArray();
    expect(clients).toHaveLength(2);

    // Strategy: Replace -> only c-restored should exist
    await restoreBackup(backupPayload, 'replace', testDb);
    clients = await testDb.clients.toArray();
    expect(clients).toHaveLength(1);
    expect(clients[0].id).toBe('c-restored');
  });

  it('wipes and resets database safely', async () => {
    await clientsRepo.create({ name: 'To be wiped' }, testDb);
    await resetAllData(testDb);

    const clients = await testDb.clients.toArray();
    expect(clients).toHaveLength(0);

    // Services were re-seeded
    const services = await testDb.services.toArray();
    expect(services.length).toBeGreaterThan(0);
  });
});
