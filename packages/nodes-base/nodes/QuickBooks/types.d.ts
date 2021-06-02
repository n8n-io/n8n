export type QuickBooksOAuth2Credentials = {
	environment: 'production' | 'sandbox';
	oauthTokenData: {
		callbackQueryString: {
			realmId: string;
		}
	};
};
