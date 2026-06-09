import { test, expect } from '../../../fixtures/base';

/**
 * E2E baseline for the instance MCP OAuth server.
 *
 * The existing mcp-service.spec.ts only exercises the API-key auth path. This
 * spec locks in the OAuth server behaviour — discovery documents (RFC 8414 +
 * RFC 9728), Dynamic Client Registration, the authorize → consent → token flow
 * with PKCE, refresh/revoke, the MCP-disabled gate, and using an OAuth bearer
 * token against /mcp-server/http.
 *
 * It exists as a regression net for the upcoming extraction of the OAuth server
 * into a shared `oauth-server` module (IAM-797): the payloads asserted here must
 * stay byte-identical across that move.
 *
 * The default `api` fixture is signed in as owner, so the consent endpoints
 * (which require an authenticated n8n user) work without extra plumbing.
 */
test.describe(
	'MCP OAuth Server',
	{
		annotation: [{ type: 'owner', description: 'IAM' }],
	},
	() => {
		// `setMcpAccess` toggles instance-global state, so run serially to avoid
		// the "access disabled" test racing with the OAuth-flow tests.
		test.describe.configure({ mode: 'serial' });

		test.beforeEach(async ({ api }) => {
			await api.setMcpAccess(true);
		});

		test.describe('Discovery', () => {
			test('should expose RFC 8414 authorization-server metadata', async ({ api }) => {
				const response = await api.mcpOAuth.getAuthorizationServerMetadataResponse();
				expect(response.status()).toBe(200);
				// Discovery is served cross-origin for browser-based MCP clients.
				expect(response.headers()['access-control-allow-origin']).toBe('*');

				const metadata = (await response.json()) as Awaited<
					ReturnType<typeof api.mcpOAuth.getAuthorizationServerMetadata>
				>;

				expect(metadata.issuer).toBeTruthy();
				expect(metadata.authorization_endpoint).toBe(`${metadata.issuer}/mcp-oauth/authorize`);
				expect(metadata.token_endpoint).toBe(`${metadata.issuer}/mcp-oauth/token`);
				expect(metadata.registration_endpoint).toBe(`${metadata.issuer}/mcp-oauth/register`);
				expect(metadata.revocation_endpoint).toBe(`${metadata.issuer}/mcp-oauth/revoke`);
				expect(metadata.response_types_supported).toEqual(['code']);
				expect(metadata.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
				expect(metadata.token_endpoint_auth_methods_supported).toEqual([
					'none',
					'client_secret_post',
					'client_secret_basic',
				]);
				expect(metadata.code_challenge_methods_supported).toEqual(['S256']);
				expect(metadata.scopes_supported.length).toBeGreaterThan(0);
			});

			test('should answer CORS preflight for authorization-server metadata', async ({ api }) => {
				const response = await api.mcpOAuth.optionsAuthorizationServerMetadata();

				expect(response.status()).toBe(204);
			});

			test('should expose RFC 9728 protected-resource metadata', async ({ api }) => {
				const metadata = await api.mcpOAuth.getProtectedResourceMetadata();

				expect(metadata.resource).toMatch(/\/mcp-server\/http$/);
				expect(metadata.bearer_methods_supported).toEqual(['header']);
				expect(metadata.authorization_servers.length).toBeGreaterThan(0);
				expect(metadata.scopes_supported.length).toBeGreaterThan(0);
			});

			test('should advertise the resource that matches the authorization server issuer', async ({
				api,
			}) => {
				const asMetadata = await api.mcpOAuth.getAuthorizationServerMetadata();
				const resourceMetadata = await api.mcpOAuth.getProtectedResourceMetadata();

				expect(resourceMetadata.resource).toBe(`${asMetadata.issuer}/mcp-server/http`);
				expect(resourceMetadata.authorization_servers).toContain(asMetadata.issuer);
			});
		});

		test.describe('Dynamic Client Registration', () => {
			test('should register a public client and return its id', async ({ api }) => {
				const response = await api.mcpOAuth.registerClientResponse();

				expect(response.status()).toBeLessThan(300);

				const client = await response.json();
				expect(client.client_id).toBeTruthy();
				expect(client.redirect_uris).toContain('http://localhost:3000/callback');
				expect(client.grant_types).toEqual(['authorization_code', 'refresh_token']);
			});

			test('should reject registration without redirect_uris', async ({ api }) => {
				const response = await api.mcpOAuth.registerClientResponse({ redirect_uris: [] });

				expect(response.status()).toBeGreaterThanOrEqual(400);
			});
		});

		test.describe('Authorization code flow', () => {
			test('should mint an access token via authorize → consent → token', async ({ api }) => {
				const { tokens } = await api.mcpOAuth.completeAuthorizationCodeFlow();

				expect(tokens.access_token).toBeTruthy();
				expect(tokens.refresh_token).toBeTruthy();
				expect(tokens.token_type).toBe('Bearer');
				expect(tokens.expires_in).toBeGreaterThan(0);
			});

			test('should accept the issued OAuth token against /mcp-server/http', async ({ api }) => {
				const { tokens } = await api.mcpOAuth.completeAuthorizationCodeFlow();

				const message = api.mcp.createMessage('tools/list');
				const response = await api.mcp.internalMcpSendMessage(tokens.access_token, message);

				expect(response.status()).toBeLessThan(300);
			});

			test('should redirect to consent and expose the client name', async ({ api }) => {
				const client = await api.mcpOAuth.registerClient();
				const { codeChallenge } = api.mcpOAuth.createPkcePair();

				const authorizeResponse = await api.mcpOAuth.authorize({
					clientId: client.client_id,
					codeChallenge,
				});

				expect(authorizeResponse.status()).toBe(302);
				expect(authorizeResponse.headers().location).toBe('/oauth/consent');

				const details = await api.mcpOAuth.getConsentDetails();
				expect(details.clientId).toBe(client.client_id);
				expect(details.clientName).toBe(client.client_name);
			});

			test('should redirect with access_denied when consent is denied', async ({ api }) => {
				const client = await api.mcpOAuth.registerClient();
				const { codeChallenge } = api.mcpOAuth.createPkcePair();

				await api.mcpOAuth.authorize({
					clientId: client.client_id,
					codeChallenge,
					state: 'denied-state',
				});

				const redirectUrl = await api.mcpOAuth.submitConsent(false);

				const url = new URL(redirectUrl);
				expect(url.searchParams.get('error')).toBe('access_denied');
				expect(url.searchParams.get('state')).toBe('denied-state');
			});

			test('should reject an authorization code reused at the token endpoint', async ({ api }) => {
				const client = await api.mcpOAuth.registerClient();
				const { codeVerifier, codeChallenge } = api.mcpOAuth.createPkcePair();

				await api.mcpOAuth.authorize({ clientId: client.client_id, codeChallenge });
				const redirectUrl = await api.mcpOAuth.submitConsent(true);
				const code = new URL(redirectUrl).searchParams.get('code')!;

				const first = await api.mcpOAuth.exchangeAuthorizationCodeResponse({
					code,
					clientId: client.client_id,
					codeVerifier,
				});
				expect(first.status()).toBeLessThan(300);

				const second = await api.mcpOAuth.exchangeAuthorizationCodeResponse({
					code,
					clientId: client.client_id,
					codeVerifier,
				});
				expect(second.status()).toBeGreaterThanOrEqual(400);
			});

			test('should reject an authorization request with a mismatched resource indicator', async ({
				api,
			}) => {
				const client = await api.mcpOAuth.registerClient();
				const { codeChallenge } = api.mcpOAuth.createPkcePair();

				const response = await api.mcpOAuth.authorize({
					clientId: client.client_id,
					codeChallenge,
					resource: 'https://attacker.example.com/mcp-server/http',
				});

				expect(response.status()).toBe(400);
				const body = await response.json();
				expect(body.error).toBe('invalid_target');
			});
		});

		test.describe('Refresh and revoke', () => {
			test('should rotate tokens with a refresh token', async ({ api }) => {
				const { client, tokens } = await api.mcpOAuth.completeAuthorizationCodeFlow();

				const rotated = await api.mcpOAuth.refreshToken({
					refreshToken: tokens.refresh_token,
					clientId: client.client_id,
				});

				expect(rotated.access_token).toBeTruthy();
				expect(rotated.refresh_token).toBeTruthy();
				expect(rotated.access_token).not.toBe(tokens.access_token);
				expect(rotated.refresh_token).not.toBe(tokens.refresh_token);
			});

			test('should reject a revoked access token at /mcp-server/http', async ({ api }) => {
				const { client, tokens } = await api.mcpOAuth.completeAuthorizationCodeFlow();

				const message = api.mcp.createMessage('tools/list');
				const before = await api.mcp.internalMcpSendMessage(tokens.access_token, message);
				expect(before.status()).toBeLessThan(300);

				const revoke = await api.mcpOAuth.revokeTokenResponse({
					token: tokens.access_token,
					clientId: client.client_id,
					tokenTypeHint: 'access_token',
				});
				expect(revoke.status()).toBeLessThan(300);

				const after = await api.mcp.internalMcpSendMessage(tokens.access_token, message);
				expect(after.status()).toBe(401);
			});
		});

		test.describe('MCP access gate', () => {
			test('should reject OAuth endpoints when MCP access is disabled', async ({ api }) => {
				// The next test's beforeEach re-enables access, so no explicit restore needed.
				await api.setMcpAccess(false);

				const registerResponse = await api.mcpOAuth.registerClientResponse();
				expect(registerResponse.status()).toBe(403);

				const { codeChallenge } = api.mcpOAuth.createPkcePair();
				const authorizeResponse = await api.mcpOAuth.authorize({
					clientId: 'any-client',
					codeChallenge,
				});
				expect(authorizeResponse.status()).toBe(403);
			});
		});
	},
);
