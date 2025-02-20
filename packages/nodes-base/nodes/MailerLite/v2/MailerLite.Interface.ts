export interface CustomField {
	name: string;
	key: string;
}

export interface SubscriberFields {
	city: string | null;
	company: string | null;
	country: string | null;
	last_name: string | null;
	name: string | null;
	phone: string | null;
	state: string | null;
	z_i_p: string | null;
}

export interface Subscriber {
	id: string;
	email: string;
	status: string;
	source: string;
	sent: number;
	opens_count: number;
	clicks_count: number;
	open_rate: number;
	click_rate: number;
	ip_address: string | null;
	subscribed_at: string;
	unsubscribed_at: string | null;
	created_at: string;
	updated_at: string;
	fields: SubscriberFields;
	opted_in_at: string | null;
	optin_ip: string | null;
}
