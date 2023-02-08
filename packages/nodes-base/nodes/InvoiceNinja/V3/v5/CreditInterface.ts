import type { Credit } from './interfaces/credit';
import { InvoiceItem } from './interfaces/invoice-item';

export type ICreditItem = Partial<Omit<InvoiceItem, '_id'>>;

export interface ICredit extends Partial<Omit<Credit, 'id' | 'line_items' | 'amount' | 'user_id' | 'recurring_id' | 'status_id' | 'entity_type'>> {
	line_items?: ICreditItem[];
}
