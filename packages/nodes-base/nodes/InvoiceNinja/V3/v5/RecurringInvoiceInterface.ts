import type { InvoiceItem } from './interfaces/invoice-item';
import type { RecurringInvoice } from './interfaces/recurring-invoice';

export type IRecurringInvoiceItem = Partial<Omit<InvoiceItem, '_id'>>;

export interface IRecurringInvoice
	extends Partial<
		Omit<RecurringInvoice, 'id' | 'line_items' | 'amount' | 'user_id' | 'status_id' | 'entity_type'>
	> {
	client_id?: string;
	line_items?: IRecurringInvoiceItem[];
}
