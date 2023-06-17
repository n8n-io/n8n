import type { IDataObject } from 'n8n-workflow';

export interface IAddress {
	country_code?: string;
	field?: string;
	line1?: string;
	line2?: string;
	locality?: string;
	postal_code?: string;
	region?: string;
	zip_code?: string;
	zip_four?: string;
}

export interface ICustomField {
	content: IDataObject;
	id: number;
}

export interface IEmailContact {
	email?: string;
	field?: string;
}

export interface IFax {
	field?: string;
	number?: string;
	type?: string;
}

export interface IPhone {
	extension?: string;
	field?: string;
	number?: string;
	type?: string;
}

export interface ISocialAccount {
	name?: string;
	type?: string;
}

export interface IContact {
	addresses?: IAddress[];
	anniversary?: string;
	company?: IDataObject;
	contact_type?: string;
	custom_fields?: ICustomField[];
	duplicate_option?: string;
	email_addresses?: IEmailContact[];
	family_name?: string;
	fax_numbers?: IFax[];
	given_name?: string;
	job_title?: string;
	lead_source_id?: number;
	middle_name?: string;
	opt_in_reason?: string;
	origin?: IDataObject;
	owner_id?: number;
	phone_numbers?: IPhone[];
	preferred_locale?: string;
	preferred_name?: string;
	prefix?: string;
	social_accounts?: ISocialAccount[];
	source_type?: string;
	spouse_name?: string;
	suffix?: string;
	time_zone?: string;
	website?: string;
}
