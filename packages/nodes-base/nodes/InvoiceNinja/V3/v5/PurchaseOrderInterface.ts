import { InvoiceItem } from "./interfaces/invoice-item";
import { PurchaseOrder } from "./interfaces/purchase-order";

export interface IPurchaseOrderItem extends Partial<Omit<InvoiceItem, '_id'>> {

}

export interface IPurchaseOrder extends Partial<Omit<PurchaseOrder, 'id' | 'line_items'>> {
	line_items?: IPurchaseOrderItem[];
}
