import { useLiveQuery } from 'dexie-react-hooks';
import { servicesRepo } from '../db/repositories/servicesRepo.js';

export function useServices({ activeOnly = false } = {}) {
  const services = useLiveQuery(
    () => servicesRepo.getAll({ activeOnly }),
    [activeOnly],
    []
  );

  return {
    services: services || [],
    isLoading: services === undefined,
    createService: (data) => servicesRepo.create(data),
    updateService: (id, updates) => servicesRepo.update(id, updates),
    toggleActive: (id) => servicesRepo.toggleActive(id),
    deleteService: (id) => servicesRepo.delete(id),
  };
}
