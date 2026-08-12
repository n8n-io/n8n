export interface ILineItem {
	id?: number;
	product_id?: number;
	variant_id?: number;
	title?: string;
	price?: string;
	grams?: string;
	quantity?: number;
}

export interface IDiscountCode {
	code?: string;
	amount?: string;
	type?: string;
}

export interface IAddress {
	first_name?: string;
	last_name?: string;
	company?: string;
	address1?: string;
	address2?: string;
	city?: string;
	province?: string;
	country?: string;
	phone?: string;
	zip?: string;
}

export interface IOrder {
	billing_address?: IAddress;
	discount_codes?: IDiscountCode[];
	email?: string;
	fulfillment_status?: string;
	inventory_behaviour?: string;
	line_items?: ILineItem[];
	location_id?: number;
	note?: string;
	send_fulfillment_receipt?: boolean;
	send_receipt?: boolean;
	shipping_address?: IAddress;
	source_name?: string;
	tags?: string;
	test?: boolean;
}
