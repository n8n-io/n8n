export interface IItem {
	description?: string;
	price?: number;
	product_id?: number;
	quantity?: number;
}

export interface IShippingAddress {
	company?: string;
	country_code?: string;
	first_name?: string;
	last_name?: string;
	line1?: string;
	line2?: string;
	locality?: string;
	middle_name?: string;
	postal_code?: string;
	region?: string;
	zip_code?: string;
	zip_four?: string;
}

export interface IEcommerceOrder {
	contact_id: number;
	lead_affiliate_id?: string;
	order_date: string;
	order_items?: IItem[];
	order_title: string;
	order_type?: string;
	promo_codes?: string[];
	sales_affiliate_id?: number;
	shipping_address?: IShippingAddress;
}
