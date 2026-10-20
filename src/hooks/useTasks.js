import { useLiveQuery } from 'dexie-react-hooks';
import { tasksRepo } from '../db/repositories/tasksRepo.js';

export function useTasks(filters = {}) {
  const tasks = useLiveQuery(
    () => tasksRepo.getAll(filters),
    [filters.status, filters.filter, filters.clientId, filters.projectId, filters.priority],
    []
  );

  return {
    tasks: tasks || [],
    isLoading: tasks === undefined,
    createTask: (data) => tasksRepo.create(data),
    updateTask: (id, updates) => tasksRepo.update(id, updates),
    completeTask: (id) => tasksRepo.completeTask(id),
    reopenTask: (id) => tasksRepo.reopenTask(id),
    deleteTask: (id) => tasksRepo.delete(id),
  };
}

export function useTask(id) {
  const task = useLiveQuery(() => tasksRepo.getById(id), [id], null);

  return {
    task,
    isLoading: task === undefined,
    updateTask: (updates) => tasksRepo.update(id, updates),
    completeTask: () => tasksRepo.completeTask(id),
    reopenTask: () => tasksRepo.reopenTask(id),
    deleteTask: () => tasksRepo.delete(id),
  };
}
