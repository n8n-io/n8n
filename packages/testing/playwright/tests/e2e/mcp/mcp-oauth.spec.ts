import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * E2E tests for the instance-level MCP OAuth2 server.
 *
 * Baseline coverage for the full authorization code + PKCE flow before the
 * OAuth server is extracted into a reusable package (for the MCP Trigger
 * node). The per-endpoint validation logic is already covered by integration
 * tests in packages/cli/src/modules/mcp/__tests__; these tests focus on the
 * cross-endpoint glue that only exists on a running instance:
 *
 *   discovery → dynamic client registration → /mcp-oauth/authorize (session
 *   cookie + redirect) → consent (REST + UI) → code exchange with PKCE →
 *   authenticated /mcp-server/http calls → refresh rotation → revocation.
 *
 * NOTE: Tests run serially because MCP access (`setMcpAccess`) is
 * instance-global state, same as mcp-service.spec.ts.
 */

// Both this spec and mcp-service.spec.ts toggle the instance-global MCP access
// setting; in parallel workers against a shared instance, one file's
// disabled-state test can break the other's OAuth flow mid-request. In
// container runs this gives the OAuth spec its own worker/container. (Local
// runs against a shared N8N_BASE_URL ignore this — run the two files
// sequentially.)
test.use({ capability: { env: { TEST_ISOLATION: 'mcp-oauth' } } });

const CALLBACK_PATH = 'mcp-oauth-e2e-callback';

test.describe(
	'MCP OAuth',
	{
		annotation: [{ type: 'owner', description: 'AI' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });

		test.beforeEach(async ({ api }) => {
			await api.setMcpAccess(true);
		});

		test.describe('Discovery', () => {
			test('should expose authorization server metadata with CORS for external clients', async ({
				api,
			}) => {
				const response = await api.mcpOauth.getAuthorizationServerMetadata();

				expect(response.status()).toBe(200);
				expect(response.headers()['access-control-allow-origin']).toBe('*');

				const metadata = await response.json();
				expect(metadata.authorization_endpoint).toBe(`${metadata.issuer}/mcp-oauth/authorize`);
				expect(metadata.token_endpoint).toBe(`${metadata.issuer}/mcp-oauth/token`);
				expect(metadata.registration_endpoint).toBe(`${metadata.issuer}/mcp-oauth/register`);
				expect(metadata.revocation_endpoint).toBe(`${metadata.issuer}/mcp-oauth/revoke`);
				expect(metadata.response_types_supported).toEqual(['code']);
				expect(metadata.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
				expect(metadata.code_challenge_methods_supported).toEqual(['S256']);
			});

			test('should expose protected resource metadata pointing at the MCP server', async ({
				api,
			}) => {
				const response = await api.mcpOauth.getProtectedResourceMetadata();

				expect(response.status()).toBe(200);
				expect(response.headers()['access-control-allow-origin']).toBe('*');

				const metadata = await response.json();
				expect(metadata.resource).toMatch(/\/mcp-server\/http$/);
				expect(metadata.bearer_methods_supported).toEqual(['header']);
				expect(metadata.authorization_servers).toHaveLength(1);
			});
		});

		test.describe('Authorization code flow', () => {
			test('should complete the full PKCE flow and grant access to the MCP server', async ({
				api,
			}) => {
				const redirectUri = 'https://example.com/callback';
				const state = nanoid();
				const pkce = api.mcpOauth.createPkcePair();

				const client = await api.mcpOauth.registerClientOrFail({
					client_name: `e2e OAuth client ${nanoid(8)}`,
					redirect_uris: [redirectUri],
					grant_types: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_method: 'none',
				});
				expect(client.client_id).toBeTruthy();

				// Authorize redirects to the consent page and sets the OAuth session cookie
				const authorizeResponse = await api.mcpOauth.authorize({
					clientId: client.client_id,
					redirectUri,
					challenge: pkce.challenge,
					state,
				});
				expect(authorizeResponse.status()).toBe(302);
				expect(authorizeResponse.headers().location).toBe('/oauth/consent');

				// The consent page can resolve the pending session to the client name
				const detailsResponse = await api.mcpOauth.getConsentDetails();
				expect(detailsResponse.ok()).toBe(true);
				const details = await detailsResponse.json();
				expect(details.data.clientName).toBe(client.client_name);
				expect(details.data.clientId).toBe(client.client_id);

				// Approving returns the client callback URL with code and state
				const callbackUrl = await api.mcpOauth.submitConsentOrFail(true);
				expect(callbackUrl.href).toContain(redirectUri);
				expect(callbackUrl.searchParams.get('state')).toBe(state);
				const code = callbackUrl.searchParams.get('code');
				expect(code).toBeTruthy();

				// Exchange the code for tokens with the PKCE verifier
				const tokens = await api.mcpOauth.exchangeAuthorizationCodeOrFail({
					code: code!,
					clientId: client.client_id,
					codeVerifier: pkce.verifier,
					redirectUri,
				});
				expect(tokens.token_type).toBe('Bearer');
				expect(tokens.access_token).toBeTruthy();
				expect(tokens.refresh_token).toBeTruthy();
				expect(tokens.expires_in).toBeGreaterThan(0);

				// The access token authenticates against the MCP server endpoint
				const message = api.mcp.createMessage('tools/list');
				const mcpResponse = await api.mcp.internalMcpSendMessageNoAuth(message, {
					Authorization: `Bearer ${tokens.access_token}`,
				});
				expect(mcpResponse.status()).toBeLessThan(300);
			});

			test('should redirect back with access_denied when the user denies consent', async ({
				api,
			}) => {
				const redirectUri = 'https://example.com/callback';
				const state = nanoid();
				const pkce = api.mcpOauth.createPkcePair();

				const client = await api.mcpOauth.registerClientOrFail({
					client_name: `e2e OAuth client ${nanoid(8)}`,
					redirect_uris: [redirectUri],
					grant_types: ['authorization_code'],
					token_endpoint_auth_method: 'none',
				});

				const authorizeResponse = await api.mcpOauth.authorize({
					clientId: client.client_id,
					redirectUri,
					challenge: pkce.challenge,
					state,
				});
				expect(authorizeResponse.status()).toBe(302);

				const callbackUrl = await api.mcpOauth.submitConsentOrFail(false);
				expect(callbackUrl.searchParams.get('error')).toBe('access_denied');
				expect(callbackUrl.searchParams.get('code')).toBeNull();
				expect(callbackUrl.searchParams.get('state')).toBe(state);
			});

			test('should reject consent endpoints without a pending OAuth session', async ({ api }) => {
				const response = await api.mcpOauth.getConsentDetails();

				expect(response.status()).toBe(400);
			});

			test('should reject token exchange with an incorrect PKCE code verifier', async ({ api }) => {
				const redirectUri = 'https://example.com/callback';
				const pkce = api.mcpOauth.createPkcePair();

				const client = await api.mcpOauth.registerClientOrFail({
					client_name: `e2e OAuth client ${nanoid(8)}`,
					redirect_uris: [redirectUri],
					grant_types: ['authorization_code'],
					token_endpoint_auth_method: 'none',
				});

				await api.mcpOauth.authorize({
					clientId: client.client_id,
					redirectUri,
					challenge: pkce.challenge,
				});
				const callbackUrl = await api.mcpOauth.submitConsentOrFail(true);
				const code = callbackUrl.searchParams.get('code')!;

				const wrongVerifier = api.mcpOauth.createPkcePair().verifier;
				const response = await api.mcpOauth.exchangeAuthorizationCode({
					code,
					clientId: client.client_id,
					codeVerifier: wrongVerifier,
					redirectUri,
				});

				expect(response.status()).toBe(400);
				const body = await response.json();
				expect(body.error).toBe('invalid_grant');
			});

			test('should reject reuse of an authorization code', async ({ api }) => {
				const redirectUri = 'https://example.com/callback';
				const pkce = api.mcpOauth.createPkcePair();

				const client = await api.mcpOauth.registerClientOrFail({
					client_name: `e2e OAuth client ${nanoid(8)}`,
					redirect_uris: [redirectUri],
					grant_types: ['authorization_code'],
					token_endpoint_auth_method: 'none',
				});

				await api.mcpOauth.authorize({
					clientId: client.client_id,
					redirectUri,
					challenge: pkce.challenge,
				});
				const callbackUrl = await api.mcpOauth.submitConsentOrFail(true);
				const code = callbackUrl.searchParams.get('code')!;

				const exchangeParams = {
					code,
					clientId: client.client_id,
					codeVerifier: pkce.verifier,
					redirectUri,
				};

				const firstExchange = await api.mcpOauth.exchangeAuthorizationCode(exchangeParams);
				expect(firstExchange.ok()).toBe(true);

				const replayExchange = await api.mcpOauth.exchangeAuthorizationCode(exchangeParams);
				expect(replayExchange.status()).toBe(400);
				const body = await replayExchange.json();
				expect(body.error).toBe('invalid_grant');
			});

			test('should reject token exchange with a non-canonical resource indicator', async ({
				api,
			}) => {
				const redirectUri = 'https://example.com/callback';
				const pkce = api.mcpOauth.createPkcePair();

				const client = await api.mcpOauth.registerClientOrFail({
					client_name: `e2e OAuth client ${nanoid(8)}`,
					redirect_uris: [redirectUri],
					grant_types: ['authorization_code'],
					token_endpoint_auth_method: 'none',
				});

				await api.mcpOauth.authorize({
					clientId: client.client_id,
					redirectUri,
					challenge: pkce.challenge,
				});
				const callbackUrl = await api.mcpOauth.submitConsentOrFail(true);
				const code = callbackUrl.searchParams.get('code')!;

				const response = await api.mcpOauth.exchangeAuthorizationCode({
					code,
					clientId: client.client_id,
					codeVerifier: pkce.verifier,
					redirectUri,
					resource: 'https://attacker.example.com/mcp-server/http',
				});

				expect(response.status()).toBe(400);
				const body = await response.json();
				expect(body.error).toBe('invalid_target');
			});
		});

		test.describe('Refresh tokens', () => {
			test('should rotate the refresh token and invalidate the previous one', async ({ api }) => {
				const { client, tokens } = await api.mcpOauth.completeAuthorizationCodeFlow();

				const refreshResponse = await api.mcpOauth.refreshToken({
					refreshToken: tokens.refresh_token,
					clientId: client.client_id,
				});
				expect(refreshResponse.ok()).toBe(true);
				const rotatedTokens = await refreshResponse.json();
				expect(rotatedTokens.access_token).toBeTruthy();
				expect(rotatedTokens.refresh_token).toBeTruthy();
				expect(rotatedTokens.refresh_token).not.toBe(tokens.refresh_token);

				// The rotated access token authenticates against the MCP server
				const message = api.mcp.createMessage('tools/list');
				const mcpResponse = await api.mcp.internalMcpSendMessageNoAuth(message, {
					Authorization: `Bearer ${rotatedTokens.access_token}`,
				});
				expect(mcpResponse.status()).toBeLessThan(300);

				// The previous refresh token is single-use and now rejected
				const reusedRefreshResponse = await api.mcpOauth.refreshToken({
					refreshToken: tokens.refresh_token,
					clientId: client.client_id,
				});
				expect(reusedRefreshResponse.status()).toBe(400);
			});
		});

		test.describe('Revocation', () => {
			test('should reject MCP requests with a revoked access token', async ({ api }) => {
				const { client, tokens } = await api.mcpOauth.completeAuthorizationCodeFlow();

				const message = api.mcp.createMessage('tools/list');
				const beforeRevoke = await api.mcp.internalMcpSendMessageNoAuth(message, {
					Authorization: `Bearer ${tokens.access_token}`,
				});
				expect(beforeRevoke.status()).toBeLessThan(300);

				const revokeResponse = await api.mcpOauth.revokeToken({
					token: tokens.access_token,
					clientId: client.client_id,
					tokenTypeHint: 'access_token',
				});
				expect(revokeResponse.ok()).toBe(true);

				const afterRevoke = await api.mcp.internalMcpSendMessageNoAuth(message, {
					Authorization: `Bearer ${tokens.access_token}`,
				});
				expect(afterRevoke.status()).toBe(401);
			});

			test('should succeed silently when revoking an unknown token', async ({ api }) => {
				const { client } = await api.mcpOauth.completeAuthorizationCodeFlow();

				// RFC 7009: revocation of an unknown token is not an error
				const response = await api.mcpOauth.revokeToken({
					token: 'unknown-token',
					clientId: client.client_id,
				});

				expect(response.ok()).toBe(true);
			});
		});

		test.describe('Neutral /oauth/* endpoint aliases', () => {
			// The OAuth endpoints are also mounted under neutral /oauth/* paths
			// (next to the /mcp-oauth/* paths advertised in discovery), which
			// future, non-MCP protected resources will advertise. The aliases must
			// serve the identical flow.
			test('should serve the full authorization code flow on the /oauth/* aliases', async ({
				api,
			}) => {
				const { client, tokens } = await api.mcpOauth.completeAuthorizationCodeFlow({
					clientName: `e2e alias client ${nanoid(8)}`,
					basePath: '/oauth',
				});

				// The access token minted via the aliases authenticates against the MCP server
				const message = api.mcp.createMessage('tools/list');
				const mcpResponse = await api.mcp.internalMcpSendMessageNoAuth(message, {
					Authorization: `Bearer ${tokens.access_token}`,
				});
				expect(mcpResponse.status()).toBeLessThan(300);

				// Refresh rotation works through the alias token endpoint
				const refreshResponse = await api.mcpOauth.refreshToken({
					refreshToken: tokens.refresh_token,
					clientId: client.client_id,
					basePath: '/oauth',
				});
				expect(refreshResponse.ok()).toBe(true);
				const rotatedTokens = await refreshResponse.json();

				// Revocation through the alias endpoint invalidates the token at the MCP server
				const revokeResponse = await api.mcpOauth.revokeToken({
					token: rotatedTokens.access_token,
					clientId: client.client_id,
					tokenTypeHint: 'access_token',
					basePath: '/oauth',
				});
				expect(revokeResponse.ok()).toBe(true);

				const afterRevoke = await api.mcp.internalMcpSendMessageNoAuth(message, {
					Authorization: `Bearer ${rotatedTokens.access_token}`,
				});
				expect(afterRevoke.status()).toBe(401);
			});
		});

		test.describe('MCP access disabled', () => {
			test.beforeEach(async ({ api }) => {
				await api.setMcpAccess(false);
			});

			test.afterEach(async ({ api }) => {
				await api.setMcpAccess(true);
			});

			test('should block OAuth endpoints when MCP access is disabled', async ({ api }) => {
				const responses = await Promise.all([
					api.mcpOauth.registerClient({
						client_name: `e2e OAuth client ${nanoid(8)}`,
						redirect_uris: ['https://example.com/callback'],
						grant_types: ['authorization_code'],
						token_endpoint_auth_method: 'none',
					}),
					api.mcpOauth.authorize({
						clientId: 'any-client',
						redirectUri: 'https://example.com/callback',
						challenge: api.mcpOauth.createPkcePair().challenge,
					}),
					api.mcpOauth.exchangeAuthorizationCode({
						code: 'any-code',
						clientId: 'any-client',
						codeVerifier: 'any-verifier',
						redirectUri: 'https://example.com/callback',
					}),
				]);

				for (const response of responses) {
					expect(response.status()).toBe(403);
				}
			});
		});

		test.describe('Consent screen', () => {
			test('should let the user approve access from the consent screen', async ({ n8n, api }) => {
				const redirectUri = `http://localhost/${CALLBACK_PATH}`;
				const state = nanoid();
				const pkce = api.mcpOauth.createPkcePair();

				const client = await api.mcpOauth.registerClientOrFail({
					client_name: `e2e consent client ${nanoid(8)}`,
					redirect_uris: [redirectUri],
					grant_types: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_method: 'none',
				});

				// Intercept the client callback so the browser redirect resolves
				await n8n.page.route(`**/${CALLBACK_PATH}*`, async (route) => {
					await route.fulfill({
						status: 200,
						contentType: 'text/html',
						body: '<html><body>OAuth callback received</body></html>',
					});
				});

				await n8n.oauthConsent.goto(
					api.mcpOauth.buildAuthorizeUrl({
						clientId: client.client_id,
						redirectUri,
						challenge: pkce.challenge,
						state,
					}),
				);

				await expect(n8n.oauthConsent.getConsentContent()).toBeVisible();
				await expect(n8n.oauthConsent.getConsentContent()).toContainText(client.client_name);

				await n8n.oauthConsent.allow();
				await n8n.page.waitForURL(`**/${CALLBACK_PATH}*`);

				const callbackUrl = new URL(n8n.page.url());
				expect(callbackUrl.searchParams.get('state')).toBe(state);
				const code = callbackUrl.searchParams.get('code');
				expect(code).toBeTruthy();

				const tokens = await api.mcpOauth.exchangeAuthorizationCodeOrFail({
					code: code!,
					clientId: client.client_id,
					codeVerifier: pkce.verifier,
					redirectUri,
				});

				const message = api.mcp.createMessage('tools/list');
				const mcpResponse = await api.mcp.internalMcpSendMessageNoAuth(message, {
					Authorization: `Bearer ${tokens.access_token}`,
				});
				expect(mcpResponse.status()).toBeLessThan(300);
			});
		});
	},
);
