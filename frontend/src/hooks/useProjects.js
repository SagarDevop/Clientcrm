import { useLiveQuery } from 'dexie-react-hooks';
import { projectsRepo } from '../db/repositories/projectsRepo.js';

export function useProjects(filters = {}) {
  const projects = useLiveQuery(
    () => projectsRepo.getAll(filters),
    [filters.clientId, filters.status, filters.serviceId],
    []
  );

  return {
    projects: projects || [],
    isLoading: projects === undefined,
    createProject: (data, opts) => projectsRepo.create(data, opts),
    updateProject: (id, updates) => projectsRepo.update(id, updates),
    completeProject: (id) => projectsRepo.complete(id),
    deleteProject: (id) => projectsRepo.delete(id),
  };
}

export function useProject(id) {
  const project = useLiveQuery(() => projectsRepo.getById(id), [id], null);
  const progress = useLiveQuery(() => (id ? projectsRepo.getProgress(id) : null), [id], null);

  return {
    project,
    progress,
    isLoading: project === undefined,
    updateProject: (updates) => projectsRepo.update(id, updates),
    completeProject: () => projectsRepo.complete(id),
    deleteProject: () => projectsRepo.delete(id),
  };
}
