import { useLiveQuery } from 'dexie-react-hooks';
import { interactionsRepo } from '../db/repositories/interactionsRepo.js';

export function useInteractions({ leadId, clientId } = {}) {
  const interactions = useLiveQuery(
    () => interactionsRepo.getForEntity({ leadId, clientId }),
    [leadId, clientId],
    []
  );

  return {
    interactions: interactions || [],
    isLoading: interactions === undefined,
    logInteraction: (data) => interactionsRepo.logInteraction(data),
    deleteInteraction: (id) => interactionsRepo.delete(id),
  };
}

export function useRecentInteractions(limit = 10) {
  const interactions = useLiveQuery(
    () => interactionsRepo.getRecent(limit),
    [limit],
    []
  );

  return {
    interactions: interactions || [],
    isLoading: interactions === undefined,
  };
}
