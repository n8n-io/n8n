export interface IItem {
	cost?: number;
	notes?: string;
	product_key?: string;
	qty?: number;
	tax_rate1?: number;
	tax_rate2?: number;
	tax_name1?: string;
	tax_name2?: string;
}

export interface IInvoice {
	auto_bill?: boolean;
	client_id?: number;
	custom_value1?: number;
	custom_value2?: number;
	email_invoice?: boolean;
	email?: string;
	discount?: number;
	due_date?: string;
	invoice_date?: string;
	invoice_items?: IItem[];
	invoice_number?: string;
	invoice_status_id?: number;
	is_amount_discount?: boolean;
	paid?: number;
	partial?: number;
	partial_due_date?: string;
	po_number?: string;
	private_notes?: string;
	public_notes?: string;
	tax_name1?: string;
	tax_name2?: string;
	tax_rate1?: number;
	tax_rate2?: number;
}
