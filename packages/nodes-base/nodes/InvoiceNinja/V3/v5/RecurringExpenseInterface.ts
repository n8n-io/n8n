import { RecurringExpense } from "./interfaces/recurring-expense";

export interface IRecurringExpense extends Partial<Omit<RecurringExpense, 'id'>> {
	
}
