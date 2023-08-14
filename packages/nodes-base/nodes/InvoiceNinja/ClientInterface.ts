export interface IContact {
	first_name?: string;
	last_name?: string;
	email?: string;
	phone?: string;
}

export interface IClient {
	contacts?: IContact[];
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
	private_notes?: string;
	website?: string;
	vat_number?: string;
	id_number?: string;
}
