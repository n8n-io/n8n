export type ZohoCalendarOAuth2ApiCredentials = {
	oauthTokenData: {
		api_domain: string;
	};
};

export type LoadedLayoutscalendar = {
	calendars: Array<{
		name: string;
		uid: string;
	}>;
};

export type LoadedLayoutsevent = {
	events: Array<{
		title: string;
		uid: string;
	}>;
};
