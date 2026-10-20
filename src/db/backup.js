import { db, ensureDbSeeded } from './database.js';

export const BACKUP_VERSION = 1;
export const APP_IDENTIFIER = 'BizCRM';

/**
 * Export all database tables into a versioned JSON object
 */
export async function exportDatabaseToJson(database = db) {
  const [clients, leads, interactions, projects, tasks, payments, services, reminders, settings] = await Promise.all([
    database.clients.toArray(),
    database.leads.toArray(),
    database.interactions.toArray(),
    database.projects.toArray(),
    database.tasks.toArray(),
    database.payments.toArray(),
    database.services.toArray(),
    database.reminders.toArray(),
    database.settings.toArray(),
  ]);

  const backupObject = {
    app: APP_IDENTIFIER,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    recordCounts: {
      clients: clients.length,
      leads: leads.length,
      interactions: interactions.length,
      projects: projects.length,
      tasks: tasks.length,
      payments: payments.length,
      services: services.length,
      reminders: reminders.length,
      settings: settings.length,
    },
    data: {
      clients,
      leads,
      interactions,
      projects,
      tasks,
      payments,
      services,
      reminders,
      settings,
    },
  };

  return backupObject;
}

/**
 * Trigger download of the JSON backup file in the browser
 */
export function downloadBackupFile(backupObject) {
  const jsonStr = JSON.stringify(backupObject, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bizcrm-backup-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate backup JSON structure and return analysis & preview
 */
export async function validateBackupJson(jsonString, database = db) {
  let parsed;
  try {
    parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  } catch {
    return {
      isValid: false,
      errors: ['Invalid JSON format. Could not parse file.'],
    };
  }

  const errors = [];
  const warnings = [];

  if (!parsed || typeof parsed !== 'object') {
    return { isValid: false, errors: ['Backup content is not a valid JSON object.'] };
  }

  if (parsed.app !== APP_IDENTIFIER) {
    warnings.push(`File app identifier "${parsed.app}" differs from expected "${APP_IDENTIFIER}".`);
  }

  if (!parsed.data || typeof parsed.data !== 'object') {
    return { isValid: false, errors: ['Missing data object in backup file.'] };
  }

  const requiredTables = ['clients', 'leads', 'interactions', 'projects', 'tasks', 'payments', 'services'];
  for (const tbl of requiredTables) {
    if (!Array.isArray(parsed.data[tbl])) {
      errors.push(`Missing or invalid "${tbl}" collection in backup file.`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Count preview
  const previewCounts = {
    clients: parsed.data.clients?.length || 0,
    leads: parsed.data.leads?.length || 0,
    interactions: parsed.data.interactions?.length || 0,
    projects: parsed.data.projects?.length || 0,
    tasks: parsed.data.tasks?.length || 0,
    payments: parsed.data.payments?.length || 0,
    services: parsed.data.services?.length || 0,
    reminders: parsed.data.reminders?.length || 0,
  };

  // Check relationship integrity within backup data
  const clientIds = new Set((parsed.data.clients || []).map((c) => c.id));
  const projectIds = new Set((parsed.data.projects || []).map((p) => p.id));
  const leadIds = new Set((parsed.data.leads || []).map((l) => l.id));

  let brokenLinks = 0;
  for (const p of parsed.data.projects || []) {
    if (p.clientId && !clientIds.has(p.clientId)) brokenLinks++;
  }
  for (const t of parsed.data.tasks || []) {
    if (t.clientId && !clientIds.has(t.clientId)) brokenLinks++;
    if (t.projectId && !projectIds.has(t.projectId)) brokenLinks++;
  }
  for (const pay of parsed.data.payments || []) {
    if (pay.clientId && !clientIds.has(pay.clientId)) brokenLinks++;
  }
  for (const i of parsed.data.interactions || []) {
    if (i.leadId && !leadIds.has(i.leadId)) brokenLinks++;
    if (i.clientId && !clientIds.has(i.clientId)) brokenLinks++;
  }

  if (brokenLinks > 0) {
    warnings.push(`Found ${brokenLinks} cross-entity references that do not match items inside the backup.`);
  }

  // Check existing conflicts
  const existingClientCount = await database.clients.count();
  const existingLeadCount = await database.leads.count();

  return {
    isValid: true,
    errors: [],
    warnings,
    previewCounts,
    hasExistingData: existingClientCount > 0 || existingLeadCount > 0,
    exportedAt: parsed.exportedAt,
    parsedBackup: parsed,
  };
}

/**
 * Execute restore inside an atomic IndexedDB transaction
 * strategy: 'replace' | 'merge'
 */
export async function restoreBackup(parsedBackup, strategy = 'replace', database = db) {
  if (!parsedBackup || !parsedBackup.data) {
    throw new Error('Invalid backup payload');
  }

  const { data } = parsedBackup;

  const tables = [
    database.clients,
    database.leads,
    database.interactions,
    database.projects,
    database.tasks,
    database.payments,
    database.services,
    database.reminders,
    database.settings,
  ];

  return database.transaction('rw', tables, async () => {
    if (strategy === 'replace') {
      // Clear all tables
      await Promise.all([
        database.clients.clear(),
        database.leads.clear(),
        database.interactions.clear(),
        database.projects.clear(),
        database.tasks.clear(),
        database.payments.clear(),
        database.services.clear(),
        database.reminders.clear(),
      ]);
    }

    // Insert records
    if (data.clients?.length) await database.clients.bulkPut(data.clients);
    if (data.leads?.length) await database.leads.bulkPut(data.leads);
    if (data.interactions?.length) await database.interactions.bulkPut(data.interactions);
    if (data.projects?.length) await database.projects.bulkPut(data.projects);
    if (data.tasks?.length) await database.tasks.bulkPut(data.tasks);
    if (data.payments?.length) await database.payments.bulkPut(data.payments);
    if (data.services?.length) await database.services.bulkPut(data.services);
    if (data.reminders?.length) await database.reminders.bulkPut(data.reminders);

    if (strategy === 'replace' && data.settings?.length) {
      await database.settings.clear();
      await database.settings.bulkPut(data.settings);
    }

    return {
      success: true,
      restoredCounts: {
        clients: data.clients?.length || 0,
        leads: data.leads?.length || 0,
        interactions: data.interactions?.length || 0,
        projects: data.projects?.length || 0,
        tasks: data.tasks?.length || 0,
        payments: data.payments?.length || 0,
        services: data.services?.length || 0,
      },
    };
  });
}

/**
 * Wipe all local data with safety check
 */
export async function resetAllData(database = db) {
  await database.transaction(
    'rw',
    [
      database.clients,
      database.leads,
      database.interactions,
      database.projects,
      database.tasks,
      database.payments,
      database.reminders,
      database.services,
      database.settings,
    ],
    async () => {
      await database.clients.clear();
      await database.leads.clear();
      await database.interactions.clear();
      await database.projects.clear();
      await database.tasks.clear();
      await database.payments.clear();
      await database.reminders.clear();
      await database.services.clear();
      await database.settings.clear();
    }
  );

  await ensureDbSeeded(database);
  return true;
}
