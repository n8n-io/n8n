export interface IExpense {
	amount?: number;
	client_id?: number;
	expense_category_id?: number;
	expense_date?: string;
	payment_date?: string;
	payment_type_id?: number;
	should_be_invoiced?: boolean;
	tax_name1?: string;
	tax_name2?: string;
	tax_name3?: string;
	tax_rate1?: number;
	tax_rate2?: number;
	tax_rate3?: number;
	transaction_reference?: string;
	vendor_id?: number;
	private_notes?: string;
	public_notes?: string;
	custom_value1?: string;
	custom_value2?: string;
	custom_value3?: string;
	custom_value4?: string;
}
