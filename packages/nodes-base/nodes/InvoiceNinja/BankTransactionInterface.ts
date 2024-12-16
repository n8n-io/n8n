export interface IBankTransaction {
	amount?: number;
	bank_integration_id?: number;
	base_type?: string;
	currency_id?: number;
	date?: string;
	description?: string;
	id?: string;
	payment_id?: string;
}

export interface IBankTransactions {
	transactions: IBankTransaction[];
}
