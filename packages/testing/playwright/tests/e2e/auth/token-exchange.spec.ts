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
		// All tests in this file share a single n8n container. Parallelising them
		// would pay the ~30–90 s container startup per worker; the tests themselves
		// are short API calls, so serial execution is cheaper overall.
		test.describe.configure({ mode: 'serial' });

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

				console.log('Exchange response', await exchangeResponse.text());

				expect(exchangeResponse.status()).toBe(200);

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
					role: 'global:admin',
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
			test('should return a bounded expires_in on exchange @auth:owner', async ({ api }) => {
				const now = Math.floor(Date.now() / 1000);
				const subjectTtlSeconds = 6;
				const subjectToken = mintExternalJwt({ exp: now + subjectTtlSeconds });

				const exchangeResponse = await api.request.post('/rest/auth/oauth/token', {
					form: {
						grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
						subject_token: subjectToken,
					},
				});
				expect(exchangeResponse.ok()).toBe(true);

				const { access_token: accessToken, expires_in: expiresIn } = await exchangeResponse.json();

				// Access token lifetime must not exceed the subject token's remaining TTL
				expect(expiresIn).toBeGreaterThan(0);
				expect(expiresIn).toBeLessThanOrEqual(subjectTtlSeconds);

				// Token is usable immediately after exchange
				const immediateResponse = await api.request.get('/api/v1/workflows', {
					headers: { 'x-n8n-api-key': accessToken },
				});
				expect(immediateResponse.ok()).toBe(true);

				// Real-clock rejection of expired access tokens is covered by
				// integration tests against the JWT middleware to avoid an e2e sleep.
			});
		});

		// -- Error Cases --

		test.describe('Error cases', () => {
			test('should reject invalid subject tokens with invalid_grant @auth:owner', async ({
				api,
			}) => {
				const now = Math.floor(Date.now() / 1000);
				const { privateKey: untrustedKey } = generateKeyPairSync('rsa', {
					modulusLength: 2048,
					publicKeyEncoding: { type: 'spki', format: 'pem' },
					privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
				});

				// Prime the replay cache with a successful exchange, then reuse the same jti.
				const replayedToken = mintExternalJwt();
				const firstReplay = await api.request.post('/rest/auth/oauth/token', {
					form: {
						grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
						subject_token: replayedToken,
					},
				});
				expect(firstReplay.ok()).toBe(true);

				const cases: Array<{ name: string; token: string }> = [
					{ name: 'expired subject token', token: mintExternalJwt({ exp: now - 60 }) },
					{ name: 'untrusted signing key', token: mintExternalJwtWithKey(untrustedKey) },
					{ name: 'replayed jti', token: replayedToken },
				];

				for (const { name, token } of cases) {
					const response = await api.request.post('/rest/auth/oauth/token', {
						form: {
							grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
							subject_token: token,
						},
					});
					expect(response.status(), name).toBe(400);
					const body = await response.json();
					expect(body.error, name).toBe('invalid_grant');
				}
			});

			test('should reject JWT with missing required claims @auth:owner', async ({ api }) => {
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
