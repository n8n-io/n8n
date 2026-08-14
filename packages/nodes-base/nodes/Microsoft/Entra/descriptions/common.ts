export const ignoreHttpStatusErrorsConfig = {
	ignore: true as const,
	// 401 responses must be passed to requestWithAuthentication so expired OAuth2 tokens can refresh.
	except: [401],
};
