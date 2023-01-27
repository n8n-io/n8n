import { Expense } from "./interfaces/expense";

export interface IExpense extends Partial<Omit<Expense, 'id'>> {
	
}
