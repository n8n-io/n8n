import type { InvoiceItem } from './interfaces/invoice-item';
import type { PurchaseOrder } from './interfaces/purchase-order';

export type IPurchaseOrderItem = Partial<Omit<InvoiceItem, '_id'>>;

export interface IPurchaseOrder extends Partial<Omit<PurchaseOrder, 'id' | 'amount' | 'balance' | 'line_items' | 'user_id' | 'status_id' | 'subscription_id' | 'expense_id' | 'entity_type'>> {
	line_items?: IPurchaseOrderItem[];
	currency_id?: string;
}
