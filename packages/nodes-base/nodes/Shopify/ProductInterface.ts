import {
	IDataObject,
} from 'n8n-workflow';

export interface IImage {
	id?: string;
	product_id?: string;
	position?: number;
	created_at?: string;
	updated_at?: string;
	width?: number;
	height?: number;
	src?: string;
	variant_ids?: number[];
}

export interface IPrice {
	currency_code?: string;
	amount?: string;
}

export interface IPresentmentPrices {
	price?: IPrice;
	compare_at_price?: IPrice;
}

export interface IVariant {
	barcode?: string;
	compare_at_price?: string;
	created_at?: string;
	fulfillment_service?: string;
	grams?: number;
	id?: number;
	image_id?: number;
	inventory_item_id?: number;
	inventory_management?: string;
	inventory_policy?: string;
	option1?: string;
	option2?: string;
	option3?: string;
	presentment_prices?: IPresentmentPrices[];
	price?: string;
	product_id?: number;
	sku?: string;
	taxable?: boolean;
	tax_code?: string;
	title?: string;
	updated_at?: string;
	weight?: number;
	weight_unit?: string;
}

export interface IProduct {
	body_html?: string;
	handle?: string;
	images?: IImage[];
	options?: IDataObject[];
	product_type?: string;
	published_at?: string;
	published_scope?: string;
	tags?: string;
	template_suffix?: string;
	title?: string;
	variants?: IVariant[];
	vendor?: string;
}
