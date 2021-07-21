export type FreshworksCrmApiCredentials = {
	apiKey: string;
	domain: string;
}

export type FreshworksConfigResponse<T> = {
	[key: string]: T[];
};

export type LoadedResource = {
	name: string;
	id: string;
};

export type LoadedCurrency = {
	currency_code: string;
	id: string;
};

export type LoadedUser = {
	id: string;
	display_name: string;
};

export type Attendees = {
	appointment_attendees_attributes?: number[];
};
