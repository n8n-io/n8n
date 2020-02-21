import { IDataObject } from 'n8n-workflow';

export interface IDimension {
	height?: string;
	length?: string;
	width?: string;
}

export interface IImage {
	alt?: string;
	name?: string;
	src?: string;
}

export interface IProduct {
	backorders?: string;
	button_text?: string;
	catalog_visibility?: string;
	categories?: IDataObject[];
	cross_sell_ids?: string[];
	date_on_sale_from?: string;
	date_on_sale_to?: string;
	description?: string;
	dimensions?: IDimension;
	downloadable?: boolean;
	external_url?: string;
	featured?: boolean;
	images?: IImage[];
	manage_stock?: boolean;
	menu_order?: number;
	meta_data?: IDataObject[];
	name?: string;
	parent_id?: string;
	price?: string;
	purchase_note?: string;
	regular_price?: string;
	reviews_allowed?: boolean;
	sale_price?: string;
	shipping_class?: string;
	short_description?: string;
	sku?: string;
	slug?: string;
	sold_individually?: boolean;
	status?: string;
	stock_quantity?: number;
	stock_status?: string;
	tags?: IDataObject[];
	tax_class?: string;
	tax_status?: string;
	type?: string;
	upsell_ids?: string[];
	virtual?: boolean;
	weight?: string;
}
