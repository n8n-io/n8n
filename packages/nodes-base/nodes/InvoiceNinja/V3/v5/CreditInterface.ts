import type { Credit } from './interfaces/credit';

export type ICredit = Partial<Omit<Credit, 'id' | 'user_id'>>;
