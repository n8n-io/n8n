import type { Expense } from './interfaces/expense';

export type IExpense = Partial<Omit<Expense, 'id' | 'user_id'>>;
