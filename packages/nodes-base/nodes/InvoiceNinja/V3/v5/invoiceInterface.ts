import type { Invoice } from './interfaces/invoice';
import type { InvoiceItem } from './interfaces/invoice-item';

export type IInvoiceItem = Partial<Omit<InvoiceItem, '_id'>>;

export interface IInvoice extends Partial<Omit<Invoice, 'id' | 'line_items' | 'client'>> {
	client_id?: string;
	line_items?: IInvoiceItem[];
}
