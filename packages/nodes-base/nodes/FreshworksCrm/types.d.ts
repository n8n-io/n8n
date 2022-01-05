export type FreshworksCrmApiCredentials = {
	apiKey: string;
	domain: string;
}

export type FreshworksConfigResponse<T> = {
	[key: string]: T[];
};

export type LoadOption = {
	name: string;
	value: string;
};

export type LoadedCurrency = {
	currency_code: string;
	id: string;
};

export type LoadedUser = {
	id: string;
	display_name: string;
};

export type SalesAccounts = {
	sales_accounts?: number[];
};

export type ViewsResponse = {
	filters: View[];
	meta: object;
}

export type View = {
	id: number;
	name: string;
	model_class_name: string;
	user_id: number;
	is_default: boolean;
	updated_at: string;
	user_name: string;
	current_user_permissions: string[];
};
