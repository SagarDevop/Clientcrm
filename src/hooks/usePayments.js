import { useLiveQuery } from 'dexie-react-hooks';
import { paymentsRepo } from '../db/repositories/paymentsRepo.js';

export function usePayments(filters = {}) {
  const payments = useLiveQuery(
    () => paymentsRepo.getAll(filters),
    [filters.clientId, filters.projectId, filters.status],
    []
  );

  return {
    payments: payments || [],
    isLoading: payments === undefined,
    recordPayment: (data) => paymentsRepo.create(data),
    updatePayment: (id, updates) => paymentsRepo.update(id, updates),
    voidPayment: (id, reason) => paymentsRepo.voidTransaction(id, reason),
    deletePayment: (id) => paymentsRepo.delete(id),
  };
}

export function useFinancialSummary({ clientId, projectId } = {}) {
  const summary = useLiveQuery(
    () => paymentsRepo.getFinancialSummary({ clientId, projectId }),
    [clientId, projectId],
    {
      agreedAmount: 0,
      recordedCollected: 0,
      recordedRefunds: 0,
      recordedAdjustments: 0,
      netReceived: 0,
      outstanding: 0,
      overpaid: 0,
      pendingAmount: 0,
      voidedAmount: 0,
      transactionCount: 0,
    }
  );

  return summary;
}
