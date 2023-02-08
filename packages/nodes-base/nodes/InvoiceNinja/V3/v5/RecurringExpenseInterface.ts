import type { RecurringExpense } from './interfaces/recurring-expense';

export type IRecurringExpense = Partial<Omit<RecurringExpense, 'id' | 'user_id' | 'entity_type'>>;
