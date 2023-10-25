import type { IDataObject } from 'n8n-workflow';

export interface NewCustomer {
	customer?: Customer;
	password?: string;
	redirectUrl?: string;
}

export interface Customer {
	id?: number;
	group_id?: number;
	default_billing?: string;
	default_shipping?: string;
	confirmation?: string;
	created_at?: string;
	updated_at?: string;
	created_in?: string;
	dob?: string;
	email?: string;
	firstname?: string;
	lastname?: string;
	middlename?: string;
	prefix?: string;
	suffix?: string;
	gender?: number;
	store_id?: number;
	taxvat?: string;
	website_id?: number;
	addresses?: Address[];
	disable_auto_group_change?: number;
	extension_attributes?: CustomerExtensionAttributes;
	custom_attributes?: CustomAttribute[];
}

export interface Address {
	id?: number;
	customer_id?: number;
	region?: Region;
	region_id?: number;
	country_id?: string;
	street?: string[];
	company?: string;
	telephone?: string;
	fax?: string;
	postcode?: string;
	city?: string;
	firstname?: string;
	lastname?: string;
	middlename?: string;
	prefix?: string;
	suffix?: string;
	vat_id?: string;
	default_shipping?: boolean;
	default_billing?: boolean;
	extension_attributes?: AddressExtensionAttributes;
	custom_attributes?: CustomAttribute[];
}

export interface CustomAttribute {
	attribute_code?: string;
	value?: string;
}

export interface AddressExtensionAttributes {
	amazon_id?: string;
	is_subscribed?: boolean;
	vertex_customer_role?: string;
	vertex_customer_country?: string;
}

export interface Region {
	region_code?: string;
	region?: string;
	region_id?: number;
	extension_attributes?: AddressExtensionAttributes;
}

export interface CustomerExtensionAttributes {
	company_attributes?: CompanyAttributes;
	is_subscribed?: boolean;
	amazon_id?: string;
	vertex_customer_code?: string;
	vertex_customer_country?: string;
}

export interface CompanyAttributes {
	customer_id?: number;
	company_id?: number;
	job_title?: string;
	status?: number;
	telephone?: string;
	extension_attributes?: AddressExtensionAttributes;
}

export interface CustomerAttributeMetadata {
	frontend_input?: string;
	input_filter?: string;
	store_label?: string;
	validation_rules?: ValidationRule[];
	multiline_count?: number;
	visible?: boolean;
	required?: boolean;
	data_model?: string;
	options?: CustomerAttributeMetadataOption[];
	frontend_class?: string;
	user_defined?: boolean;
	sort_order?: number;
	frontend_label?: string;
	note?: string;
	system?: boolean;
	backend_type?: string;
	is_used_in_grid?: boolean;
	is_visible_in_grid?: boolean;
	is_filterable_in_grid?: boolean;
	is_searchable_in_grid?: boolean;
	attribute_code?: string;
}

export interface CustomerAttributeMetadataOption {
	label?: string;
	value?: string;
	options?: IDataObject[];
}

export interface ValidationRule {
	name?: string;
	value?: string;
}

export interface Search {
	search_criteria?: SearchCriteria;
	total_count?: number;
}

export interface SearchCriteria {
	filter_groups?: FilterGroup[];
	sort_orders?: SortOrder[];
	page_size?: number;
	current_page?: number;
}

export interface FilterGroup {
	filters?: Filter[];
}

export interface Filter {
	field?: string;
	value?: string;
	condition_type?: string;
}

export interface SortOrder {
	field?: string;
	direction?: string;
}

export interface NewProduct {
	product?: Product;
	saveOptions?: boolean;
}

export interface Product {
	id?: number;
	sku?: string;
	name?: string;
	attribute_set_id?: number;
	price?: number;
	status?: number;
	visibility?: number;
	type_id?: string;
	created_at?: string;
	updated_at?: string;
	weight?: number;
	extension_attributes?: {
		category_links?: [
			{
				category_id?: string;
			},
		];
	};
	custom_attributes?: CustomAttribute[];
}

export interface ProductAttribute {
	is_filterable_in_search: boolean;
	default_frontend_label: string;
	attribute_id: string;
	is_filterable: boolean;
	used_for_sort_by: boolean;
	is_searchable: string;
	attribute_code: string;
}
