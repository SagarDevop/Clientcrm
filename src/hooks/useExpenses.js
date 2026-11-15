import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { expensesRepo } from '../db/repositories/expensesRepo.js';
import { saasApi, getAuthToken } from '../services/saasApi.js';

export function useExpenses() {
  const expenses = useLiveQuery(() => expensesRepo.getAll(), []) || [];

  const addExpense = async (data) => {
    const record = await expensesRepo.create(data);
    if (getAuthToken()) {
      try {
        await saasApi.create('expenses', {
          id: record.id,
          title: record.description || record.vendor || 'Expense',
          category: record.category,
          amount: record.amount,
          date: record.date,
          vendor: record.vendor,
          notes: record.description,
        });
      } catch (err) {
        console.warn('Expense cloud sync notice:', err.message);
      }
    }
    return record;
  };

  const deleteExpense = async (id) => {
    if (db.expenses) {
      await db.expenses.delete(id);
    }
    if (getAuthToken()) {
      try {
        await saasApi.delete('expenses', id);
      } catch (err) {}
    }
  };

  return {
    expenses,
    addExpense,
    deleteExpense,
  };
}
