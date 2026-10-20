import { useLiveQuery } from 'dexie-react-hooks';
import { leadsRepo } from '../db/repositories/leadsRepo.js';

export function useLeads(filters = {}) {
  const leads = useLiveQuery(
    () => leadsRepo.getAll(filters),
    [filters.stage, filters.serviceId, filters.search, filters.excludeWon],
    []
  );

  return {
    leads: leads || [],
    isLoading: leads === undefined,
    createLead: (data) => leadsRepo.create(data),
    updateLead: (id, updates) => leadsRepo.update(id, updates),
    convertToClient: (id, options) => leadsRepo.convertToClient(id, options),
    markLost: (id, reason) => leadsRepo.markLost(id, reason),
    reopen: (id) => leadsRepo.reopen(id),
    deleteLead: (id) => leadsRepo.delete(id),
    checkDuplicates: (fields) => leadsRepo.findDuplicates(fields),
  };
}

export function useLead(id) {
  const lead = useLiveQuery(() => leadsRepo.getById(id), [id], null);

  return {
    lead,
    isLoading: lead === undefined,
    updateLead: (updates) => leadsRepo.update(id, updates),
    convertToClient: (options) => leadsRepo.convertToClient(id, options),
    markLost: (reason) => leadsRepo.markLost(id, reason),
    reopen: () => leadsRepo.reopen(id),
  };
}
