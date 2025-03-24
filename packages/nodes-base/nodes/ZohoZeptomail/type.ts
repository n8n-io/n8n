export type ZohoZeptomailOAuth2ApiCredentials = {
	oauthTokenData: {
		api_domain: string;
	};
};

export type LoadedLayoutsMailagent = {
	data: Array<{
		mailagent_name: string;
		mailagent_key: string;
	}>;
};

export type LoadedLayoutsTemplate = {
	data: Array<{
		data: Array<{
			template_name: string;
			template_key: string;
		}>;
	}>;
};
