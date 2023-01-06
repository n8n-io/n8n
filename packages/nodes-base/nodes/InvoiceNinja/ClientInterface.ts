export interface IContact {
	first_name?: string;
	last_name?: string;
	email?: string;
	phone?: string;
}

export interface IClient {
	id_number?: string;
	name?: string;
	address1?: string;
	address2?: string;
	city?: string;
	state?: string;
	postal_code?: string;
	country_id?: number;
	shipping_address1?: string;
	shipping_address2?: string;
	shipping_city?: string;
	shipping_state?: string;
	shipping_postal_code?: string;
	shipping_country_id?: number;
	work_phone?: string;
	website?: string;
	vat_number?: string;
	contacts?: IContact[];
	private_notes?: string;
	public_notes?: string;
	custom_value1?: string;
	custom_value2?: string;
	custom_value3?: string;
	custom_value4?: string;
}
