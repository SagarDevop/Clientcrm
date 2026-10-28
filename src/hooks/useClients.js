import { useLiveQuery } from 'dexie-react-hooks';
import { clientsRepo } from '../db/repositories/clientsRepo.js';

export function useClients(filters = {}) {
  const clients = useLiveQuery(
    () => clientsRepo.getAll(filters),
    [filters.status, filters.serviceId, filters.search],
    []
  );

  return {
    clients: clients || [],
    isLoading: clients === undefined,
    createClient: (data) => clientsRepo.create(data),
    createWithPlan: (data) => clientsRepo.createWithPlan(data),
    updateClient: (id, updates) => clientsRepo.update(id, updates),
    archiveClient: (id) => clientsRepo.archive(id),
    restoreClient: (id) => clientsRepo.restore(id),
    deleteClient: (id) => clientsRepo.delete(id),
    checkDuplicates: (fields) => clientsRepo.findDuplicates(fields),
  };
}

export function useClient(id) {
  const client = useLiveQuery(() => clientsRepo.getById(id), [id], null);

  return {
    client,
    isLoading: client === undefined,
    updateClient: (updates) => clientsRepo.update(id, updates),
    recordPayment: (paymentData) => clientsRepo.recordPayment(id, paymentData),
    startNextMonth: (nextMonthData) => clientsRepo.startNextMonth(id, nextMonthData),
    archiveClient: () => clientsRepo.archive(id),
    restoreClient: () => clientsRepo.restore(id),
  };
}

