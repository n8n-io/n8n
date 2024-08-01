export interface IPayment {
	invoice_id?: number;
	amount?: number;
	payment_type_id?: number;
	type_id?: number;
	transaction_reference?: string;
	private_notes?: string;
	client_id?: string;
	invoices?: IInvoice[];
}

export interface IInvoice {
	invoice_id: string;
	amount: number;
}
