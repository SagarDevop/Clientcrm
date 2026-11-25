import { db } from './database.js';

export async function validateDatabaseIntegrity(database = db) {
  const [clients, leads, projects, tasks, payments, interactions, services] = await Promise.all([
    database.clients.toArray(),
    database.leads.toArray(),
    database.projects.toArray(),
    database.tasks.toArray(),
    database.payments.toArray(),
    database.interactions.toArray(),
    database.services.toArray(),
  ]);

  const clientIds = new Set(clients.map((c) => c.id));
  const leadIds = new Set(leads.map((l) => l.id));
  const projectIds = new Set(projects.map((p) => p.id));
  const serviceIds = new Set(services.map((s) => s.id));

  const brokenRelationships = [];

  // Check projects referencing nonexistent clients
  for (const p of projects) {
    if (p.clientId && !clientIds.has(p.clientId)) {
      brokenRelationships.push({
        type: 'project_missing_client',
        entityId: p.id,
        entityName: p.name,
        targetId: p.clientId,
        message: `Project "${p.name}" references missing client ID ${p.clientId}`,
      });
    }
  }

  // Check tasks referencing nonexistent clients or projects
  for (const t of tasks) {
    if (t.clientId && !clientIds.has(t.clientId)) {
      brokenRelationships.push({
        type: 'task_missing_client',
        entityId: t.id,
        entityName: t.title,
        targetId: t.clientId,
        message: `Task "${t.title}" references missing client ID ${t.clientId}`,
      });
    }
    if (t.projectId && !projectIds.has(t.projectId)) {
      brokenRelationships.push({
        type: 'task_missing_project',
        entityId: t.id,
        entityName: t.title,
        targetId: t.projectId,
        message: `Task "${t.title}" references missing project ID ${t.projectId}`,
      });
    }
  }

  // Check payments referencing nonexistent clients or projects
  for (const pay of payments) {
    if (pay.clientId && !clientIds.has(pay.clientId)) {
      brokenRelationships.push({
        type: 'payment_missing_client',
        entityId: pay.id,
        entityName: pay.reference || 'Payment',
        targetId: pay.clientId,
        message: `Payment references missing client ID ${pay.clientId}`,
      });
    }
    if (pay.projectId && !projectIds.has(pay.projectId)) {
      brokenRelationships.push({
        type: 'payment_missing_project',
        entityId: pay.id,
        entityName: pay.reference || 'Payment',
        targetId: pay.projectId,
        message: `Payment references missing project ID ${pay.projectId}`,
      });
    }
  }

  // Check interactions referencing nonexistent leads or clients
  for (const i of interactions) {
    if (i.leadId && !leadIds.has(i.leadId)) {
      brokenRelationships.push({
        type: 'interaction_missing_lead',
        entityId: i.id,
        entityName: i.summary || 'Interaction',
        targetId: i.leadId,
        message: `Interaction references missing lead ID ${i.leadId}`,
      });
    }
    if (i.clientId && !clientIds.has(i.clientId)) {
      brokenRelationships.push({
        type: 'interaction_missing_client',
        entityId: i.id,
        entityName: i.summary || 'Interaction',
        targetId: i.clientId,
        message: `Interaction references missing client ID ${i.clientId}`,
      });
    }
  }

  return {
    isValid: brokenRelationships.length === 0,
    brokenRelationships,
    counts: {
      clients: clients.length,
      leads: leads.length,
      projects: projects.length,
      tasks: tasks.length,
      payments: payments.length,
      interactions: interactions.length,
      services: services.length,
    },
  };
}
