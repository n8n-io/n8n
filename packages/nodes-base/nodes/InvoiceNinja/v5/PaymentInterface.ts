import { Payment } from "./interfaces/payment";
import { IInvoice } from "./invoiceInterface";

export interface IPayment extends Partial<Omit<Payment, 'id' | 'invoices'>> {
	invoices?: ({
		amount?: number;
		credit_id?: string;
		invoice_id?: string;
	})[];
}
