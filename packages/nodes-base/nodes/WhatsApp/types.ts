import type { GenericValue } from 'n8n-workflow';

export type BaseFacebookResponse<TData> = { data: TData };
export type BasePaginatedFacebookResponse<TData> = BaseFacebookResponse<TData> & {
	paging: { cursors: { before?: string; after?: string } };
};

export type WhatsAppAppWebhookSubscriptionsResponse = BaseFacebookResponse<
	WhatsAppAppWebhookSubscription[]
>;

export interface WhatsAppAppWebhookSubscription {
	object: string;
	callback_url: string;
	active: boolean;
	fields: WhatsAppAppWebhookSubscriptionField[];
}

export interface WhatsAppAppWebhookSubscriptionField {
	name: string;
	version: string;
}

export interface CreateFacebookAppWebhookSubscription {
	object: string;
	callback_url: string;
	fields: string[];
	include_values: boolean;
	verify_token: string;
}

export type FacebookPageListResponse = BasePaginatedFacebookResponse<FacebookPage[]>;
export type FacebookFormListResponse = BasePaginatedFacebookResponse<FacebookForm[]>;

export interface FacebookPage {
	id: string;
	name: string;
	access_token: string;
	category: string;
	category_list: FacebookPageCategory[];
	tasks: string[];
}

export interface FacebookPageCategory {
	id: string;
	name: string;
}

export interface FacebookFormQuestion {
	id: string;
	key: string;
	label: string;
	type: string;
}

export interface FacebookForm {
	id: string;
	name: string;
	locale: string;
	status: string;
	page: {
		id: string;
		name: string;
	};
	questions: FacebookFormQuestion[];
}

export interface WhatsAppPageEvent {
	object: 'whatsapp_business_account';
	entry: WhatsAppEventEntry[];
}

export type WhatsAppEventChanges = Array<{
	field: string;
	value: { statuses?: Array<{ status: string }> };
}>;

export interface WhatsAppEventEntry {
	id: string;
	time: number;
	changes: WhatsAppEventChanges;
}

export interface FacebookFormLeadData {
	id: string;
	created_time: string;
	ad_id: string;
	ad_name: string;
	adset_id: string;
	adset_name: string;
	form_id: string;
	field_data: [
		{
			name: string;
			values: GenericValue[];
		},
	];
}
