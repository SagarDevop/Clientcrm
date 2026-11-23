/**
 * SaaS Cloud Sync Engine
 * Synchronizes local IndexedDB changes automatically to the Node.js SaaS Cloud Backend
 */
import { saasApi, getAuthToken } from '../services/saasApi.js';
import { db } from './database.js';

let isSyncing = false;

export async function syncLocalToCloud() {
  const token = getAuthToken();
  if (!token || isSyncing) return;

  isSyncing = true;
  try {
    // 1. Sync Clients
    const localClients = await db.clients.toArray();
    for (const client of localClients) {
      try {
        await saasApi.create('clients', client);
      } catch (e) {
        // If already exists on server, update it
        try {
          await saasApi.update('clients', client.id, client);
        } catch (err) {}
      }
    }

    // 2. Sync Projects
    const localProjects = await db.projects.toArray();
    for (const proj of localProjects) {
      try {
        await saasApi.create('projects', proj);
      } catch (e) {
        try {
          await saasApi.update('projects', proj.id, proj);
        } catch (err) {}
      }
    }

    // 3. Sync Payments
    const localPayments = await db.payments.toArray();
    for (const pay of localPayments) {
      try {
        await saasApi.create('payments', pay);
      } catch (e) {
        try {
          await saasApi.update('payments', pay.id, pay);
        } catch (err) {}
      }
    }

    // 4. Pull down cloud data to local Dexie cache so any new browser immediately gets all data
    try {
      const [cloudClients, cloudPayments, cloudExpenses, cloudProjects] = await Promise.all([
        saasApi.getAll('clients').catch(() => []),
        saasApi.getAll('payments').catch(() => []),
        saasApi.getAll('expenses').catch(() => []),
        saasApi.getAll('projects').catch(() => []),
      ]);

      if (Array.isArray(cloudClients) && cloudClients.length > 0) {
        for (const cc of cloudClients) {
          const item = { ...cc };
          delete item._id;
          await db.clients.put(item);
        }
      }

      if (Array.isArray(cloudPayments) && cloudPayments.length > 0) {
        for (const cp of cloudPayments) {
          const item = { ...cp };
          delete item._id;
          await db.payments.put(item);
        }
      }

      if (Array.isArray(cloudExpenses) && cloudExpenses.length > 0) {
        for (const ce of cloudExpenses) {
          const item = { ...ce };
          delete item._id;
          await db.expenses.put(item);
        }
      }

      if (Array.isArray(cloudProjects) && cloudProjects.length > 0) {
        for (const cpr of cloudProjects) {
          const item = { ...cpr };
          delete item._id;
          await db.projects.put(item);
        }
      }
    } catch (e) {
      console.warn('Error pulling cloud data to local DB:', e);
    }
  } catch (err) {
    console.warn('SaaS background cloud sync notice:', err.message);
  } finally {
    isSyncing = false;
  }
}

// Auto-run sync on app start and when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => syncLocalToCloud());
  setTimeout(() => syncLocalToCloud(), 2000);
  setInterval(() => syncLocalToCloud(), 60000); // sync every minute
}
