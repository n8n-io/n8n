import { Transaction } from "./interfaces/transactions";

export interface IBankTransaction extends Partial<Omit<Transaction, 'id'>> {

}
