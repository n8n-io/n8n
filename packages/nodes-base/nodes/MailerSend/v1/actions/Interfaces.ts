import {
	AllEntities,
	Entity,
	IDataObject,
	PropertiesOf,
} from 'n8n-workflow';


type MailerSendMap = {
	email: 'create' | 'sendTemplate';
	bulkEmail: 'create' | 'sendTemplate' | 'get';
	message: 'get' | 'getAll';
	domain: 'get' | 'getAll';
};

export type MailerSend = AllEntities<MailerSendMap>;

export type MailerSendEmail = Entity<MailerSendMap, 'email'>;
export type EmailProperties = PropertiesOf<MailerSendEmail>;

export type MailerSendBulkEmail = Entity<MailerSendMap, 'bulkEmail'>;
export type BulkEmailProperties = PropertiesOf<MailerSendBulkEmail>;

export type MailerSendMessage = Entity<MailerSendMap, 'message'>;
export type MessageProperties = PropertiesOf<MailerSendMessage>;

export interface IAddressPair {
	email: string;
	name?: string;
}

export interface IVariables {
	email: string;
	substitutions: ISubstitution[];
}

export interface IPersonalization {
	email: string;
	data: IDataObject[];
}

export interface ISubstitution {
	var: string;
	value: string;
}

export interface IAttachment {
	content: string;  // in Base64 encoded
	filename: string;
	id: string;
}

export interface IMail {
	from?: IAddressPair;
	to: IAddressPair[];  // max 50
	cc?: IAddressPair[];  // max 10
	bcc?: IAddressPair[];  // max 10
	reply_to?: IAddressPair;
	subject?: string;
	text?: string;
	html?: string;
	attachments?: IAttachment[];
	template_id?: string;  // only required if no text or html present
	tags?: string[];  // max 5 tags
	variables?: IVariables[];
	personalization?: IPersonalization[];
	precedence_bulk?: boolean;
	send_at?: number; // use a timestamp min: now, max: now + 72 hours
}

export interface IDomainSettings {
	send_paused: boolean;
	track_clicks: boolean;
	track_opens: boolean;
	track_unsubscribe: boolean;
	track_unsubscribe_html: string;
	track_unsubscribe_plain: string;
	track_content: boolean;
	custom_tracking_enabled: boolean;
	custom_tracking_subdomain: string;
	precedence_bulk: boolean;
}

export interface IDomain {
	id: string;
	name: string;
	dkim: boolean;
	spf: boolean;
	tracking: boolean;
	is_verified: boolean;
	is_cname_verified: boolean;
	is_dns_active: boolean;
	is_cname_active: boolean;
	is_tracking_allowed: boolean;
	has_not_queued_messages: boolean;
	not_queued_messages_count: number;
	domain_settings: IDomainSettings;
}
