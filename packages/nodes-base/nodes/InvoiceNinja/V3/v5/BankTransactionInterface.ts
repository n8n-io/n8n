import type { Transaction } from './interfaces/transactions';

export type IBankTransaction = Partial<Omit<Transaction, 'id'>>;
