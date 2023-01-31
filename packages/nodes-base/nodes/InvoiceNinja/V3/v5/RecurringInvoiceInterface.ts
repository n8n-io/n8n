import { InvoiceItem } from "./interfaces/invoice-item";
import { RecurringInvoice } from "./interfaces/recurring-invoice";

export interface IRecurringInvoiceItem extends Partial<Omit<InvoiceItem, '_id'>> {
}

export interface IRecurringInvoice extends Partial<Omit<RecurringInvoice, 'id' | 'line_items' | 'client'>> {
	client_id?: string;
	line_items?: IRecurringInvoiceItem[];
}
