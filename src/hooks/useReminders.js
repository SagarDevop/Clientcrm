import { useLiveQuery } from 'dexie-react-hooks';
import { remindersRepo } from '../db/repositories/remindersRepo.js';

export function useReminders(filters = {}) {
  const reminders = useLiveQuery(
    () => remindersRepo.getAll(filters),
    [filters.status, filters.entityType, filters.entityId],
    []
  );

  return {
    reminders: reminders || [],
    isLoading: reminders === undefined,
    completeReminder: (id) => remindersRepo.complete(id),
    dismissReminder: (id) => remindersRepo.dismiss(id),
    snoozeReminder: (id, minutes) => remindersRepo.snooze(id, minutes),
    deleteReminder: (id) => remindersRepo.delete(id),
  };
}
