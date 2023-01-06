export interface IPayment {
	invoice_id?: number;
	amount?: number;
	payment_type_id?: number;
	transaction_reference?: string;
	private_notes?: string;
	client_id?: string;
	custom_value1?: string;
	custom_value2?: string;
	custom_value3?: string;
	custom_value4?: string;
}
