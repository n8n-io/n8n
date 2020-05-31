export interface IStream {
	subscriptions?: string;
	invite_only?: boolean;
	principals?: string;
	authorization_errors_fatal?: boolean;
	history_public_to_subscribers?: boolean;
	stream_post_policy?: number;
	announce?: boolean;
	include_public?: boolean;
	include_subscribed?: boolean;
	include_all_active?: boolean;
	include_default?: boolean;
	include_owner_subscribed?: boolean;
	include_subscribers?: boolean;
	description?: string;
	new_name?: string;
	is_private?: boolean;
	is_announcement_only?: boolean;
}

export interface IPrincipal {
	email: string;
}
