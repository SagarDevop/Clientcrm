import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { clientsRepo } from '../db/repositories/clientsRepo.js';
import { saasApi, getAuthToken } from '../services/saasApi.js';

export function useClients(filters = {}) {
  const clients = useLiveQuery(
    () => clientsRepo.getAll(filters),
    [filters.status, filters.serviceId, filters.search],
    []
  );

  const createClient = async (data) => {
    const record = await clientsRepo.create(data);
    if (getAuthToken()) {
      saasApi.create('clients', record).catch((err) => console.warn('Cloud client create error:', err));
    }
    return record;
  };

  const createWithPlan = async (data) => {
    const record = await clientsRepo.createWithPlan(data);
    if (getAuthToken()) {
      saasApi.create('clients', record).catch((err) => console.warn('Cloud client create error:', err));
      if (record.tokenPaid > 0) {
        saasApi.create('payments', {
          id: `pay_tok_${record.id}`,
          clientId: record.id,
          amount: record.tokenPaid,
          type: 'token',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          paidAt: new Date().toISOString(),
          notes: `Token payment for ${record.name}`,
        }).catch((err) => console.warn('Cloud token payment create error:', err));
      }
    }
    return record;
  };

  const createWebDevClient = async (data) => {
    const record = await clientsRepo.createWebDevClient(data);
    if (getAuthToken()) {
      saasApi.create('clients', record).catch((err) => console.warn('Cloud client create error:', err));
    }
    return record;
  };

  const updateClient = async (id, updates) => {
    const record = await clientsRepo.update(id, updates);
    if (getAuthToken()) {
      saasApi.update('clients', id, record).catch((err) => console.warn('Cloud client update error:', err));
    }
    return record;
  };

  const deleteClient = async (id, force = true) => {
    await clientsRepo.delete(id, db, { force });
    if (getAuthToken()) {
      try {
        await saasApi.delete('clients', id);
      } catch (err) {
        console.warn('SaaS cloud client deletion notice:', err.message);
      }
    }
  };

  return {
    clients: clients || [],
    isLoading: clients === undefined,
    createClient,
    createWithPlan,
    createWebDevClient,
    updateClient,
    archiveClient: (id) => clientsRepo.archive(id),
    restoreClient: (id) => clientsRepo.restore(id),
    deleteClient,
    checkDuplicates: (fields) => clientsRepo.findDuplicates(fields),
  };
}

export function useClient(id) {
  const client = useLiveQuery(() => clientsRepo.getById(id), [id], null);

  const updateClientRecord = async (updates) => {
    const res = await clientsRepo.update(id, updates);
    if (getAuthToken()) {
      saasApi.update('clients', id, res).catch(() => {});
    }
    return res;
  };

  const recordPaymentRecord = async (paymentData) => {
    const res = await clientsRepo.recordPayment(id, paymentData);
    if (getAuthToken()) {
      saasApi.update('clients', id, res).catch(() => {});
      saasApi.create('payments', {
        id: `pay_${Date.now()}`,
        clientId: id,
        amount: Number(paymentData.amount) || 0,
        type: 'installment',
        status: 'completed',
        paymentMethod: paymentData.paymentMethod || 'bank_transfer',
        paidAt: paymentData.paidAt || new Date().toISOString(),
        notes: paymentData.notes || `Payment for client ${id}`,
      }).catch(() => {});
    }
    return res;
  };

  return {
    client,
    isLoading: client === undefined,
    updateClient: updateClientRecord,
    recordPayment: recordPaymentRecord,
    recordWebDevPayment: (paymentData) => clientsRepo.recordWebDevPayment(id, paymentData),
    updateWebDevDeliveryStatus: (status) => clientsRepo.updateWebDevDeliveryStatus(id, status),
    addProjectDocument: (docData) => clientsRepo.addProjectDocument(id, docData),
    removeProjectDocument: (docId) => clientsRepo.removeProjectDocument(id, docId),
    toggleProjectDeliverable: (deliverableId, isCompleted) =>
      clientsRepo.toggleProjectDeliverable(id, deliverableId, isCompleted),
    addProjectDeliverable: (title) => clientsRepo.addProjectDeliverable(id, title),
    startNextMonth: (nextMonthData) => clientsRepo.startNextMonth(id, nextMonthData),
    archiveClient: () => clientsRepo.archive(id),
    restoreClient: () => clientsRepo.restore(id),
    deleteClient: async (force = true) => {
      await clientsRepo.delete(id, db, { force });
      if (getAuthToken()) {
        try {
          await saasApi.delete('clients', id);
        } catch (err) {}
      }
    },
  };
}
