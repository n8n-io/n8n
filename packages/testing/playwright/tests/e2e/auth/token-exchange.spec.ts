import { generateKeyPairSync } from 'crypto';

import { test, expect } from '../../../fixtures/base';
import {
	getTrustedKeysConfig,
	mintExternalJwt,
	mintExternalJwtWithKey,
} from '../../../helpers/jwt-helper';

const TOKEN_EXCHANGE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange';

test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'token-exchange',
			N8N_ENV_FEAT_TOKEN_EXCHANGE: 'true',
			N8N_TOKEN_EXCHANGE_ENABLED: 'true',
			N8N_EMBED_LOGIN_ENABLED: 'true',
			N8N_TOKEN_EXCHANGE_TRUSTED_KEYS: getTrustedKeysConfig(),
			N8N_TOKEN_EXCHANGE_MAX_TOKEN_TTL: '60',
		},
	},
});

test.describe(
	'Token Exchange @licensed',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.beforeEach(async ({ api }) => {
			await api.enableFeature('tokenExchange');
		});

		// -- Happy Path --

		test.describe('Happy path', () => {
			test('should exchange external JWT for access token and call public API @auth:owner', async ({
				api,
			}) => {
				const subjectToken = mintExternalJwt();

				const exchangeResponse = await api.request.post('/rest/auth/oauth/token', {
					form: {
						grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
						subject_token: subjectToken,
					},
				});

				expect(exchangeResponse.ok()).toBe(true);
				const body = await exchangeResponse.json();
				expect(body).toMatchObject({
					access_token: expect.any(String),
					token_type: 'Bearer',
					expires_in: expect.any(Number),
					issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
				});

				// Use the issued token to call the public API
				const workflowsResponse = await api.request.get('/api/v1/workflows', {
					headers: { 'x-n8n-api-key': body.access_token },
				});

				expect(workflowsResponse.ok()).toBe(true);
			});

			test('should JIT-provision a new user on first token exchange @auth:owner', async ({
				api,
			}) => {
				const email = 'jit-provision-test@test.example';
				const subjectToken = mintExternalJwt({
					email,
					given_name: 'Provisioned',
					family_name: 'User',
				});

				const exchangeResponse = await api.request.post('/rest/auth/oauth/token', {
					form: {
						grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
						subject_token: subjectToken,
					},
				});

				expect(exchangeResponse.ok()).toBe(true);
				const { access_token: accessToken } = await exchangeResponse.json();

				// Verify the provisioned user exists via the public API
				const usersResponse = await api.request.get('/api/v1/users', {
					headers: { 'x-n8n-api-key': accessToken },
				});

				expect(usersResponse.ok()).toBe(true);
				const { data: users } = await usersResponse.json();
				const provisioned = users.find((u: { email: string }) => u.email === email);
				expect(provisioned).toBeDefined();
				expect(provisioned.firstName).toBe('Provisioned');
				expect(provisioned.lastName).toBe('User');
			});

			test('should exchange with actor token for delegation @auth:owner', async ({ api }) => {
				// Subject = service identity, Actor = human user acting on behalf of subject
				const subjectToken = mintExternalJwt({
					email: 'subject-delegation@test.example',
					role: 'global:member',
				});
				const actorToken = mintExternalJwt({
					email: 'actor-delegation@test.example',
					role: 'global:member',
				});

				const exchangeResponse = await api.request.post('/rest/auth/oauth/token', {
					form: {
						grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
						subject_token: subjectToken,
						actor_token: actorToken,
					},
				});

				expect(exchangeResponse.ok()).toBe(true);
				const { access_token: accessToken } = await exchangeResponse.json();

				// Use the delegation token to create a workflow
				const createResponse = await api.request.post('/api/v1/workflows', {
					headers: {
						'x-n8n-api-key': accessToken,
						'content-type': 'application/json',
					},
					data: {
						name: 'Delegation Test Workflow',
						nodes: [
							{
								name: 'Start',
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [250, 300],
								parameters: {},
							},
						],
						connections: {},
						settings: { executionOrder: 'v1' },
					},
				});

				expect(createResponse.ok()).toBe(true);
				const workflow = await createResponse.json();
				expect(workflow.name).toBe('Delegation Test Workflow');
			});
		});

		// -- Token Expiry --

		test.describe('Token expiry', () => {
			test('should reject API call with expired access token @auth:owner', async ({ api }) => {
				const now = Math.floor(Date.now() / 1000);
				// Issue a token that expires in 6 seconds (just above the 5s MIN_REMAINING_LIFETIME)
				const subjectToken = mintExternalJwt({ exp: now + 6 });

				const exchangeResponse = await api.request.post('/rest/auth/oauth/token', {
					form: {
						grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
						subject_token: subjectToken,
					},
				});

				expect(exchangeResponse.ok()).toBe(true);
				const { access_token: accessToken } = await exchangeResponse.json();

				// Immediate call should succeed
				const immediateResponse = await api.request.get('/api/v1/workflows', {
					headers: { 'x-n8n-api-key': accessToken },
				});
				expect(immediateResponse.ok()).toBe(true);

				// Wait for expiry
				await new Promise((resolve) => setTimeout(resolve, 7_000));

				// Call after expiry should fail
				const expiredResponse = await api.request.get('/api/v1/workflows', {
					headers: { 'x-n8n-api-key': accessToken },
				});
				expect(expiredResponse.status()).toBe(401);
			});
		});

		// -- Error Cases --

		test.describe('Error cases', () => {
			test('should reject expired external JWT @auth:owner', async ({ api }) => {
				const now = Math.floor(Date.now() / 1000);
				const expiredToken = mintExternalJwt({ exp: now - 60 });

				const response = await api.request.post('/rest/auth/oauth/token', {
					form: {
						grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
						subject_token: expiredToken,
					},
				});

				expect(response.status()).toBe(400);
				const body = await response.json();
				expect(body.error).toBe('invalid_grant');
			});

			test('should reject JWT signed with untrusted key @auth:owner', async ({ api }) => {
				const { privateKey: untrustedKey } = generateKeyPairSync('rsa', {
					modulusLength: 2048,
					publicKeyEncoding: { type: 'spki', format: 'pem' },
					privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
				});

				const token = mintExternalJwtWithKey(untrustedKey);

				const response = await api.request.post('/rest/auth/oauth/token', {
					form: {
						grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
						subject_token: token,
					},
				});

				expect(response.status()).toBe(400);
				const body = await response.json();
				expect(body.error).toBe('invalid_grant');
			});

			test('should reject replayed JWT with same jti @auth:owner', async ({ api }) => {
				const token = mintExternalJwt();

				// First exchange should succeed
				const first = await api.request.post('/rest/auth/oauth/token', {
					form: {
						grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
						subject_token: token,
					},
				});
				expect(first.ok()).toBe(true);

				// Replay should fail
				const replay = await api.request.post('/rest/auth/oauth/token', {
					form: {
						grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
						subject_token: token,
					},
				});
				expect(replay.status()).toBe(400);
				const body = await replay.json();
				expect(body.error).toBe('invalid_grant');
			});

			test('should reject JWT with missing required claims @auth:owner', async ({ api }) => {
				// Mint a JWT without the sub claim — override to empty string
				const token = mintExternalJwt({ sub: '' });

				const response = await api.request.post('/rest/auth/oauth/token', {
					form: {
						grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
						subject_token: token,
					},
				});

				expect(response.status()).toBe(400);
			});
		});

		// -- Embed Login --

		test.describe('Embed login', () => {
			test('should issue session cookie via POST /auth/embed @auth:owner', async ({ api }) => {
				const now = Math.floor(Date.now() / 1000);
				const token = mintExternalJwt({ exp: now + 30 });

				const response = await api.request.post('/rest/auth/embed', {
					data: { token },
					maxRedirects: 0,
				});

				// Embed endpoint redirects on success
				expect(response.status()).toBe(302);

				// Verify session cookie was set
				const cookies = response.headers()['set-cookie'];
				expect(cookies).toBeDefined();
				expect(cookies).toContain('n8n-auth');

				// Extract cookie and verify session works
				const cookieMatch = cookies?.match(/n8n-auth=([^;]+)/);
				expect(cookieMatch).toBeTruthy();

				const settingsResponse = await api.request.get('/rest/settings', {
					headers: {
						cookie: `n8n-auth=${cookieMatch![1]}`,
					},
				});
				expect(settingsResponse.ok()).toBe(true);
			});

			test('should issue session cookie via GET /auth/embed @auth:owner', async ({ api }) => {
				const now = Math.floor(Date.now() / 1000);
				const token = mintExternalJwt({ exp: now + 30 });

				const response = await api.request.get(
					`/rest/auth/embed?token=${encodeURIComponent(token)}`,
					{ maxRedirects: 0 },
				);

				expect(response.status()).toBe(302);

				const cookies = response.headers()['set-cookie'];
				expect(cookies).toBeDefined();
				expect(cookies).toContain('n8n-auth');
			});

			test('should reject embed login with long-lived token @auth:owner', async ({ api }) => {
				const now = Math.floor(Date.now() / 1000);
				// Lifetime of 120s exceeds the 60s MAX_TOKEN_LIFETIME for embed
				const token = mintExternalJwt({ exp: now + 120 });

				const response = await api.request.post('/rest/auth/embed', {
					data: { token },
					maxRedirects: 0,
				});

				// Should fail — token lifetime exceeds maximum
				expect(response.ok()).toBe(false);
			});
		});
	},
);
