import { db, ensureDbSeeded } from './database.js';

export const BACKUP_VERSION = 2;
export const APP_IDENTIFIER = 'BizCRM';

/**
 * Export all database tables into a versioned JSON object
 */
export async function exportDatabaseToJson(database = db) {
  const [
    clients,
    leads,
    interactions,
    projects,
    tasks,
    payments,
    services,
    reminders,
    settings,
    invoices,
    subscriptions,
    milestones,
    content_items,
    campaigns,
    expenses,
    email_jobs,
    quotations,
  ] = await Promise.all([
    database.clients.toArray(),
    database.leads.toArray(),
    database.interactions.toArray(),
    database.projects.toArray(),
    database.tasks.toArray(),
    database.payments.toArray(),
    database.services.toArray(),
    database.reminders.toArray(),
    database.settings.toArray(),
    database.invoices ? database.invoices.toArray() : [],
    database.subscriptions ? database.subscriptions.toArray() : [],
    database.milestones ? database.milestones.toArray() : [],
    database.content_items ? database.content_items.toArray() : [],
    database.campaigns ? database.campaigns.toArray() : [],
    database.expenses ? database.expenses.toArray() : [],
    database.email_jobs ? database.email_jobs.toArray() : [],
    database.quotations ? database.quotations.toArray() : [],
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
      invoices: invoices.length,
      subscriptions: subscriptions.length,
      milestones: milestones.length,
      content_items: content_items.length,
      campaigns: campaigns.length,
      expenses: expenses.length,
      email_jobs: email_jobs.length,
      quotations: quotations.length,
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
      invoices,
      subscriptions,
      milestones,
      content_items,
      campaigns,
      expenses,
      email_jobs,
      quotations,
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
    database.invoices,
    database.subscriptions,
    database.milestones,
    database.content_items,
    database.campaigns,
    database.expenses,
    database.email_jobs,
    database.quotations,
  ].filter(Boolean);

  return database.transaction('rw', tables, async () => {
    if (strategy === 'replace') {
      // Clear all tables
      const clearPromises = tables.map((t) => t.clear());
      await Promise.all(clearPromises);
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

    // v2 & v3 tables
    if (data.invoices?.length && database.invoices) await database.invoices.bulkPut(data.invoices);
    if (data.subscriptions?.length && database.subscriptions) await database.subscriptions.bulkPut(data.subscriptions);
    if (data.milestones?.length && database.milestones) await database.milestones.bulkPut(data.milestones);
    if (data.content_items?.length && database.content_items) await database.content_items.bulkPut(data.content_items);
    if (data.campaigns?.length && database.campaigns) await database.campaigns.bulkPut(data.campaigns);
    if (data.expenses?.length && database.expenses) await database.expenses.bulkPut(data.expenses);
    if (data.email_jobs?.length && database.email_jobs) await database.email_jobs.bulkPut(data.email_jobs);
    if (data.quotations?.length && database.quotations) await database.quotations.bulkPut(data.quotations);

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
        invoices: data.invoices?.length || 0,
        subscriptions: data.subscriptions?.length || 0,
        milestones: data.milestones?.length || 0,
        content_items: data.content_items?.length || 0,
        campaigns: data.campaigns?.length || 0,
        expenses: data.expenses?.length || 0,
      },
    };
  });
}

/**
 * Wipe all local data with safety check
 */
export async function resetAllData(database = db) {
  const tables = [
    database.clients,
    database.leads,
    database.interactions,
    database.projects,
    database.tasks,
    database.payments,
    database.reminders,
    database.services,
    database.settings,
    database.invoices,
    database.subscriptions,
    database.milestones,
    database.content_items,
    database.campaigns,
    database.expenses,
    database.email_jobs,
  ].filter(Boolean);

  await database.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()));
  });

  await ensureDbSeeded(database);
  return true;
}
