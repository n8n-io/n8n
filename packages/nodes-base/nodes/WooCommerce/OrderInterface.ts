import { IDataObject } from 'n8n-workflow';

export interface IAddress {
	first_name?: string;
	last_name?: string;
	company?: string;
	address_1?: string;
	address_2?: string;
	city?: string;
	state?: string;
	postcode?: string;
	country?: string;
	email?: string;
	phone?: string;
}

export interface ILineItem {
	name?: string;
	product_id?: number;
	variation_id?: number;
	quantity?: string;
	tax_class?: string;
	subtotal?: string;
	total?: string;
	meta_data?: IDataObject;
}

export interface IShoppingLine {
	method_title?: string;
	method_id?: number;
	total?: string;
	meta_data?: IDataObject;
}

export interface IFeeLine {
	name?: string;
	tax_class?: string;
	tax_status?: string;
	total?: string;
	meta_data?: IDataObject;
}

export interface ICouponLine {
	code?: string;
	meta_data?: IDataObject;
}

export interface IOrder {
	[index: string]: any; // tslint:disable-line:no-any
	billing?: IAddress;
	coupon_lines?: ICouponLine[];
	currency?: string;
	customer_id?: number;
	customer_note?: string;
	fee_lines?: IFeeLine[];
	line_items?: ILineItem[];
	meta_data?: IDataObject[];
	parent_id?: number;
	payment_method?: string;
	payment_method_title?: string;
	set_paid?: boolean;
	shipping?: IAddress;
	shipping_lines?: IShoppingLine[];
	status?: string;
	transaction_id?: string;
}
