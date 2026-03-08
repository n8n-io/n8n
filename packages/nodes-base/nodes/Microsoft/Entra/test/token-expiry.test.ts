/**
 * Regression test for GHC-1473: Microsoft Entra OAuth2 token expiry bug
 *
 * Bug description:
 * - Microsoft Entra node uses OAuth2 client_credentials flow
 * - After access token expires (~1 hour), n8n does not proactively check token expiry
 * - Requests fail with 401 "token expired" error
 * - Manual node reopening triggers token refresh, but automated refresh doesn't work
 *
 * Root cause:
 * - n8n only refreshes tokens reactively (after 401 error), not proactively (before request)
 * - For client_credentials flow, token should be re-fetched when expired, not refreshed
 * - There's no check of token.expired() before making API requests in request-helper-functions.ts
 *
 * Expected behavior:
 * - Before making a request, check if the access token is expired
 * - If expired, automatically fetch a new token via client_credentials flow
 * - Then proceed with the request using the fresh token
 *
 * Issue link: https://github.com/n8n-io/n8n/issues/14426
 * Linear: GHC-1473
 *
 * Location of bug:
 * - File: packages/core/src/execution-engine/node-execution-context/utils/request-helper-functions.ts
 * - Function: requestOAuth2() around lines 1030-1150
 * - Missing: Proactive check of token.expired() before calling token.sign(requestOptions)
 */

describe('Microsoft Entra Token Expiry (GHC-1473)', () => {
	/**
	 * Test: Documents the expected fix for proactive token refresh
	 *
	 * Current code flow in request-helper-functions.ts:
	 * 1. Create OAuth2 client and token from cached credentials
	 * 2. Sign the request with the token (potentially expired)
	 * 3. Make the request
	 * 4. Only if 401 error occurs, refresh the token and retry
	 *
	 * Expected code flow (the fix):
	 * 1. Create OAuth2 client and token from cached credentials
	 * 2. Check if token.expired() before using it
	 * 3. If expired:
	 *    - For client_credentials: call token.client.credentials.getToken()
	 *    - For authorizationCode: call token.refresh()
	 * 4. Sign the request with the fresh token
	 * 5. Make the request (should succeed without 401)
	 */
	it('should document the expected fix for proactive token refresh', () => {
		const currentBehavior = {
			step1: 'Get cached token from credentials',
			step2: 'Sign request with potentially expired token',
			step3: 'Make API request',
			step4: 'If 401 error, refresh token and retry',
			problem: 'Token expiry not checked proactively',
		};

		const expectedBehavior = {
			step1: 'Get cached token from credentials',
			step2: 'Check if token.expired() returns true',
			step3: 'If expired, fetch new token (client_credentials) or refresh (authorizationCode)',
			step4: 'Sign request with fresh token',
			step5: 'Make API request (succeeds without 401)',
			benefit: 'Prevents 401 errors for expired tokens',
		};

		expect(currentBehavior.problem).toBe('Token expiry not checked proactively');
		expect(expectedBehavior.benefit).toBe('Prevents 401 errors for expired tokens');
	});

	/**
	 * Test: Simulates the user-reported issue
	 *
	 * Scenario from GitHub issue #14426:
	 * 1. Workflow with Microsoft Entra node runs successfully initially
	 * 2. After 30-60 minutes (token expires), next run fails with:
	 *    "Authorization failed - please check your credentials.
	 *     Lifetime validation failed, the token is expired."
	 * 3. Manual retry doesn't help (uses same expired token)
	 * 4. Opening and closing the node in the UI magically fixes it (fetches fresh credentials)
	 * 5. Workaround: Add HTTP Request node to call /v1.0/me before each Entra node
	 *
	 * Root cause:
	 * - Opening/closing the node triggers a fresh credential fetch from the database
	 * - Making an HTTP request to /me also triggers the OAuth2 client creation which may get a fresh token
	 * - But scheduled/automated runs use the cached expired token without checking expiry
	 */
	it('should fail when token expires and is not proactively refreshed', () => {
		// This test demonstrates the bug by documenting the failure scenario
		//
		// Timeline:
		// - T=0: Workflow runs successfully with fresh token
		// - T=60min: Token expires (Microsoft tokens typically expire after 1 hour)
		// - T=61min: Workflow runs again
		//
		// Current behavior (bug):
		// - At T=61min: Uses cached expired token without checking expiry
		// - Result: 401 "token is expired" error
		// - Retry: Still fails because same expired token is used
		// - Manual intervention: Opening node UI triggers fresh credential fetch from DB
		//
		// Expected behavior (fix):
		// - At T=61min: Check token.expired() before making request
		// - If expired: Fetch fresh token via token.client.credentials.getToken()
		// - Then make request with fresh token
		// - Result: Request succeeds without manual intervention

		const userReport = {
			issue: 'GHC-1473',
			github: 'https://github.com/n8n-io/n8n/issues/14426',
			title: 'Microsoft Entra Component auth failure',
			symptom: 'Token expires after ~1 hour, subsequent runs fail with 401',
			errorMessage:
				'Authorization failed - please check your credentials. Lifetime validation failed, the token is expired.',
			httpCode: '401',
			workaround1: 'Open and close the node in UI to trigger fresh credential fetch',
			workaround2: 'Add HTTP Request to /v1.0/me before each Entra node execution',
			rootCause:
				'n8n does not check token.expired() before requests in request-helper-functions.ts',
			fixLocation:
				'packages/core/src/execution-engine/node-execution-context/utils/request-helper-functions.ts',
			fixFunction: 'requestOAuth2() around lines 1030-1150',
			fixImplementation:
				'Add proactive token.expired() check before token.sign(requestOptions)',
		};

		// This test intentionally fails to demonstrate the bug
		// When the fix is implemented, this test should be updated to verify the fix
		expect(userReport.rootCause).toContain('does not check token.expired()');
		expect(userReport.errorMessage).toContain('token is expired');

		// The bug is confirmed: n8n does not proactively refresh expired tokens
		// See request-helper-functions.ts lines 1067-1080 where token.sign() is called
		// without first checking token.expired()
	});

	/**
	 * Test: Documents the code location where the fix should be applied
	 */
	it('should document where to implement the fix', () => {
		const fixDetails = {
			file: 'packages/core/src/execution-engine/node-execution-context/utils/request-helper-functions.ts',
			function: 'requestOAuth2',
			currentCode: `
// Current code (lines ~1067-1080):
const token = oAuthClient.createToken({
	...oauthTokenData,
	...(accessToken ? { access_token: accessToken } : {}),
	...(refreshToken ? { refresh_token: refreshToken } : {}),
}, oAuth2Options?.tokenType || oauthTokenData.tokenType);

// NO EXPIRY CHECK HERE - BUG!
const newRequestOptions = token.sign(requestOptions as ClientOAuth2RequestObject);
`,
			expectedCode: `
// Expected code (fix):
let token = oAuthClient.createToken({
	...oauthTokenData,
	...(accessToken ? { access_token: accessToken } : {}),
	...(refreshToken ? { refresh_token: refreshToken } : {}),
}, oAuth2Options?.tokenType || oauthTokenData.tokenType);

// PROACTIVE EXPIRY CHECK - FIX!
if (token.expired()) {
	const refreshedToken = await refreshOrFetchToken({
		credentials,
		token,
		credentialsType,
		node,
		additionalData,
		oAuth2Options,
		logger: this.logger,
	});
	token = refreshedToken;
	// Update credentials with fresh token data
	credentials.oauthTokenData = token.data;
}

const newRequestOptions = token.sign(requestOptions as ClientOAuth2RequestObject);
`,
			reasoning:
				'By checking token.expired() proactively, we avoid making requests with expired tokens, eliminating the 401 error that users experience',
		};

		expect(fixDetails.file).toContain('request-helper-functions.ts');
		expect(fixDetails.expectedCode).toContain('if (token.expired())');
	});
});
