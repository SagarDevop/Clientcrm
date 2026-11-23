/**
 * SaaS Cloud Sync Engine
 * Real-time synchronization between IndexedDB (Dexie) and MongoDB Cloud Atlas
 */
import { saasApi, getAuthToken } from '../services/saasApi.js';
import { db } from './database.js';

let isSyncing = false;

export async function syncLocalToCloud() {
  const token = getAuthToken();
  if (!token || isSyncing) return;

  isSyncing = true;
  try {
    // 1. Pull down authoritative cloud data first
    const [cloudClients, cloudPayments, cloudExpenses, cloudProjects] = await Promise.all([
      saasApi.getAll('clients').catch(() => null),
      saasApi.getAll('payments').catch(() => null),
      saasApi.getAll('expenses').catch(() => null),
      saasApi.getAll('projects').catch(() => null),
    ]);

    // 2. Reconcile Clients (Handle Deletions & Additions across browsers)
    if (Array.isArray(cloudClients)) {
      const cloudClientIds = new Set(cloudClients.map((c) => c.id));
      const localClients = await db.clients.toArray();

      // Delete locally if deleted from cloud in another browser
      for (const lc of localClients) {
        if (!cloudClientIds.has(lc.id)) {
          // Verify if it was just created locally and hasn't been uploaded yet
          // If local client exists but cloud doesn't have it, only push if createdAt is very recent (<10s)
          const age = Date.now() - new Date(lc.createdAt || 0).getTime();
          if (age > 15000) {
            // It was deleted on another browser/cloud -> remove from local Dexie
            await db.clients.delete(lc.id);
          } else {
            // Newly created locally -> push to cloud
            try {
              await saasApi.create('clients', lc);
            } catch (err) {}
          }
        }
      }

      // Upsert cloud clients into local Dexie
      for (const cc of cloudClients) {
        const item = { ...cc };
        delete item._id;
        await db.clients.put(item);
      }
    }

    // 3. Reconcile Payments
    if (Array.isArray(cloudPayments)) {
      const cloudPayIds = new Set(cloudPayments.map((p) => p.id));
      const localPayments = await db.payments.toArray();

      for (const lp of localPayments) {
        if (!cloudPayIds.has(lp.id)) {
          const age = Date.now() - new Date(lp.createdAt || lp.paidAt || 0).getTime();
          if (age > 15000) {
            await db.payments.delete(lp.id);
          } else {
            try {
              await saasApi.create('payments', lp);
            } catch (err) {}
          }
        }
      }

      for (const cp of cloudPayments) {
        const item = { ...cp };
        delete item._id;
        await db.payments.put(item);
      }
    }

    // 4. Reconcile Expenses
    if (Array.isArray(cloudExpenses)) {
      const cloudExpIds = new Set(cloudExpenses.map((e) => e.id));
      const localExpenses = await db.expenses.toArray();

      for (const le of localExpenses) {
        if (!cloudExpIds.has(le.id)) {
          const age = Date.now() - new Date(le.createdAt || le.date || 0).getTime();
          if (age > 15000) {
            await db.expenses.delete(le.id);
          } else {
            try {
              await saasApi.create('expenses', le);
            } catch (err) {}
          }
        }
      }

      for (const ce of cloudExpenses) {
        const item = { ...ce };
        delete item._id;
        await db.expenses.put(item);
      }
    }

    // 5. Reconcile Projects
    if (Array.isArray(cloudProjects)) {
      const cloudProjIds = new Set(cloudProjects.map((p) => p.id));
      const localProjects = await db.projects.toArray();

      for (const lpr of localProjects) {
        if (!cloudProjIds.has(lpr.id)) {
          const age = Date.now() - new Date(lpr.createdAt || 0).getTime();
          if (age > 15000) {
            await db.projects.delete(lpr.id);
          } else {
            try {
              await saasApi.create('projects', lpr);
            } catch (err) {}
          }
        }
      }

      for (const cpr of cloudProjects) {
        const item = { ...cpr };
        delete item._id;
        await db.projects.put(item);
      }
    }
  } catch (err) {
    console.warn('SaaS background cloud sync notice:', err.message);
  } finally {
    isSyncing = false;
  }
}

// Auto-run sync on app start, window focus, online event, and short interval (every 4 seconds for real-time collaboration)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => syncLocalToCloud());
  window.addEventListener('focus', () => syncLocalToCloud());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncLocalToCloud();
    }
  });

  setTimeout(() => syncLocalToCloud(), 500);
  // Real-time polling every 4 seconds so changes in one tab appear in another almost instantly
  setInterval(() => syncLocalToCloud(), 4000);
}
