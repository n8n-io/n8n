import type { Payment } from './interfaces/payment';

export interface IPaymentAssignInvoice {
		amount?: number;
		credit_id?: string;
		invoice_id?: string;
}

export interface IPayment extends Partial<Omit<Payment, 'id' | 'invoices' | 'client_contact_id' | 'user_id' | 'vendor_id' | 'project_id' | 'transaction_id' | 'refunded' | 'applied' | 'invitation_id' | 'company_gateway_id' | 'currency_id' | 'is_manual' | 'status_id' | 'entity_type'>> {
	invoices?: IPaymentAssignInvoice[];
}
