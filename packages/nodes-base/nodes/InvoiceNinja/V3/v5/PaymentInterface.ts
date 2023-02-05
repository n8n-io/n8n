import type { Payment } from './interfaces/payment';

export interface IPayment extends Partial<Omit<Payment, 'id' | 'invoices' | 'user_id'>> {
	invoices?: Array<{
		amount?: number;
		credit_id?: string;
		invoice_id?: string;
	}>;
}
