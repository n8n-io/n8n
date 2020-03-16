export interface IExpense {
	amount?: number;
	client_id?: number;
	custom_value1?: string;
	custom_value2?: string;
	expense_category_id?: number;
	expense_date?: string;
	payment_date?: string;
	payment_type_id?: number;
	private_notes?: string;
	public_notes?: string;
	should_be_invoiced?: boolean;
	tax_name1?: string;
	tax_name2?: string;
	tax_rate1?: number;
	tax_rate2?: number;
	transaction_reference?: string;
	vendor_id?: number;
}
