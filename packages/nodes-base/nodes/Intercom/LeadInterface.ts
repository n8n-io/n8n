import type { IDataObject } from 'n8n-workflow';

export interface ILeadCompany {
	company_id?: string;
}

export interface IAvatar {
	type?: string;
	image_url?: string;
}

export interface ILead {
	user_id?: string;
	id?: string;
	email?: string;
	phone?: string;
	name?: string;
	custom_attributes?: IDataObject;
	companies?: ILeadCompany[];
	last_request_at?: number;
	unsubscribed_from_emails?: boolean;
	update_last_request_at?: boolean;
	avatar?: IAvatar;
	utm_source?: string;
	utm_medium?: string;
	utm_campaign?: string;
	utm_term?: string;
	utm_content?: string;
}
