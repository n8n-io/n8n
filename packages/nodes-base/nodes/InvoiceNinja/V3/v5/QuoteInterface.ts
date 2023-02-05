import type { InvoiceItem } from './interfaces/invoice-item';
import type { Quote } from './interfaces/quote';

export type IQuoteItem = Partial<Omit<InvoiceItem, '_id'>>;

export interface IQuote extends Partial<Omit<Quote, 'id' | 'line_items' | 'user_id'>> {
	line_items?: IQuoteItem[];
}
