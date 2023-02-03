import { Invoice } from "./interfaces/invoice";
import { InvoiceItem } from "./interfaces/invoice-item";

export interface IInvoiceItem extends Partial<Omit<InvoiceItem, '_id'>> {
}

export interface IInvoice extends Partial<Omit<Invoice, 'id' | 'line_items' | 'client'>> {
	client_id?: string;
	line_items?: IInvoiceItem[];
}
