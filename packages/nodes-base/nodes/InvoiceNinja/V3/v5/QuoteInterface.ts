import { InvoiceItem } from "./interfaces/invoice-item";
import { Quote } from "./interfaces/quote";

export interface IQuoteItem extends Partial<Omit<InvoiceItem, '_id'>> {
	
}

export interface IQuote extends Partial<Omit<Quote, 'id' | 'line_items'>> {
	line_items?: IQuoteItem[];
}
