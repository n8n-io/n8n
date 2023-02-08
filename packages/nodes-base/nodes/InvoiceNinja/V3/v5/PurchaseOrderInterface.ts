import type { InvoiceItem } from './interfaces/invoice-item';
import type { PurchaseOrder } from './interfaces/purchase-order';

export type IPurchaseOrderItem = Partial<Omit<InvoiceItem, '_id'>>;

export interface IPurchaseOrder extends Partial<Omit<PurchaseOrder, 'id' | 'line_items' | 'user_id' | 'entity_type'>> {
	line_items?: IPurchaseOrderItem[];
}
