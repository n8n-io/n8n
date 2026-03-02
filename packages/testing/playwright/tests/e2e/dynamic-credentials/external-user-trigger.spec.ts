import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import { DYNAMIC_CRED_ENDPOINT_TOKEN } from '../../../services/dynamic-credential-api-helper';

/**
 * E2E tests for the dynamic credentials feature.
 *
 * Requires:
 *   - capability: 'dynamic-credentials' (Keycloak container + env vars)
 *   - api.enableFeature('dynamicCredentials') (license feature)
 */
test.use({
	capability: 'dynamic-credentials',
	ignoreHTTPSErrors: true, // Keycloak uses a self-signed certificate
});

/**
 * Integration test: external user triggers a workflow via a production webhook.
 * The resolvable oAuth2Api credential is pre-authorized via the Keycloak authorization
 * code flow, then the HTTP Request node uses it to call the Keycloak userinfo endpoint.
 *
 * Flow:
 *   1. Create OAuth2 resolver + resolvable oAuth2Api credential (configured for Keycloak)
 *   2. Build the workflow (webhook + HTTP Request using the credential) — not yet active
 *   3. Get Keycloak access token (ROPC — identifies the external user)
 *   4. Call execution-status → credential reports "missing" → extract authorizationUrl
 *   5. POST to authorizationUrl → Keycloak login page → complete authorization code flow
 *   6. n8n callback stores user's tokens in dynamic_credential_entry
 *   7. Verify execution-status now reports credential as "configured"
 *   8. Activate the workflow (webhook + HTTP Request node using the credential)
 *   9. Trigger the production webhook with the bearer token
 *  10. Wait for execution and assert success (HTTP node resolved credential + called userinfo)
 */
test.describe(
	'Dynamic Credentials: webhook execution @capability:dynamic-credentials',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should execute HTTP node with resolvable OAuth2 credential via production webhook @auth:owner', async ({
			api,
			services,
		}) => {
			const keycloak = services.keycloak;

			// Derive Keycloak endpoint URLs from the discovery URL.
			// authUrl: EXTERNAL URL — the test machine visits this for the authorization redirect.
			// accessTokenUrl: INTERNAL URL — n8n exchanges the auth code server-to-server.
			const externalBase = keycloak.discoveryUrl.replace('/.well-known/openid-configuration', '');
			const internalBase = keycloak.internalDiscoveryUrl.replace(
				'/.well-known/openid-configuration',
				'',
			);

			// Create an OAuth2 resolver that validates tokens via Keycloak's userinfo endpoint
			const resolver = await api.dynamicCredentials.createResolver({
				name: `Keycloak OAuth2 Resolver ${nanoid()}`,
				type: 'credential-resolver.oauth2-1.0',
				config: {
					metadataUri: keycloak.internalDiscoveryUrl,
					validation: 'oauth2-userinfo',
				},
			});

			// Create a properly-configured oAuth2Api credential pointing at Keycloak.
			// The credential is resolvable — its tokens are stored per-user by the resolver.
			const credential = await api.credentials.createCredential({
				name: `Keycloak OAuth2 Credential ${nanoid()}`,
				type: 'oAuth2Api',
				data: {
					grantType: 'authorizationCode',
					authUrl: `${externalBase}/protocol/openid-connect/auth`,
					accessTokenUrl: `${internalBase}/protocol/openid-connect/token`,
					clientId: keycloak.clientId,
					clientSecret: keycloak.clientSecret,
					scope: 'openid',
					ignoreSSLIssues: true,
				},
				isResolvable: true,
			});

			// Build a workflow: webhook trigger → HTTP Request (calls Keycloak userinfo with credential)
			// The workflow is created BEFORE authorization so we can obtain the authorizationUrl
			// from the execution-status endpoint (the real flow a marketplace user would follow).
			const { workflowId, webhookPath, createdWorkflow } =
				await api.workflows.createWorkflowFromDefinition({
					name: `Dynamic Credential HTTP Webhook Workflow ${nanoid()}`,
					nodes: [
						{
							id: nanoid(),
							name: 'Webhook',
							type: 'n8n-nodes-base.webhook',
							typeVersion: 2,
							position: [0, 0] as [number, number],
							parameters: {
								httpMethod: 'GET',
								path: 'placeholder',
								responseMode: 'onReceived', // Respond immediately; execution runs async
								// Configure the execution context hook to extract the bearer token
								// from the Authorization header. Without this, the dynamic credential
								// resolver can't identify the user during execution.
								executionsHooksVersion: 1,
								contextEstablishmentHooks: {
									hooks: [
										{
											hookName: 'BearerTokenExtractor',
											isAllowedToFail: false,
										},
									],
								},
							},
						},
						{
							id: nanoid(),
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [200, 0] as [number, number],
							parameters: {
								// Keycloak userinfo endpoint — accepts Bearer tokens and returns user info (200)
								url: `${internalBase}/protocol/openid-connect/userinfo`,
								authentication: 'predefinedCredentialType',
								nodeCredentialType: 'oAuth2Api',
							},
							credentials: {
								oAuth2Api: { id: credential.id, name: credential.name },
							},
						},
					],
					connections: {
						Webhook: {
							main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
						},
					},
					settings: {
						credentialResolverId: resolver.id,
					},
				});

			// Obtain a Keycloak access token for the test user (ROPC — no browser needed).
			// This token is used as the user identity throughout the flow.
			const accessToken = await keycloak.getAccessToken(
				keycloak.testUser.email,
				keycloak.testUser.password,
			);

			// Step 1: Check execution-status before authorization.
			// The credential is not yet configured → status is "missing".
			// The response includes an authorizationUrl pointing to the n8n authorize endpoint.
			const initialStatus = await api.dynamicCredentials.getExecutionStatus(workflowId, {
				bearerToken: accessToken,
				endpointToken: DYNAMIC_CRED_ENDPOINT_TOKEN,
			});
			expect(initialStatus.credentials).toHaveLength(1);
			expect(initialStatus.credentials![0].credentialStatus).toBe('missing');

			// Step 2: Use the authorizationUrl from execution-status to start the OAuth2 flow.
			// This is the URL a real marketplace user would follow after seeing "missing" status.
			const n8nAuthorizeUrl = initialStatus.credentials![0].authorizationUrl!;
			expect(n8nAuthorizeUrl).toBeTruthy();

			// POST to the n8n authorize endpoint → returns the Keycloak authorization page URL
			const keycloakAuthUrl = await api.dynamicCredentials.startAuthorizationFromStatusUrl(
				n8nAuthorizeUrl,
				accessToken,
			);

			// Step 3: Complete the Keycloak authorization code flow for the test user.
			// Navigates Keycloak's login form and returns the n8n callback URL (with code + state).
			const n8nCallbackUrl = await keycloak.completeAuthorizationCodeFlow(keycloakAuthUrl);
			// GET the n8n callback with the owner session: n8n exchanges the code and stores tokens
			await api.request.get(n8nCallbackUrl);

			// Activate the workflow to register the production webhook URL
			await api.workflows.activate(workflowId, createdWorkflow.versionId as string);

			try {
				// Verify the credential is now "configured" for this user before triggering
				const status = await api.dynamicCredentials.getExecutionStatus(workflowId, {
					bearerToken: accessToken,
					endpointToken: DYNAMIC_CRED_ENDPOINT_TOKEN,
				});
				expect(status.credentials).toHaveLength(1);
				expect(status.credentials![0].credentialStatus).toBe('configured');

				// Trigger the production webhook with the bearer token.
				// n8n extracts the token from the Authorization header for credential resolution.
				const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath!}`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
					maxNotFoundRetries: 5,
				});
				expect(webhookResponse.status()).toBe(200);

				// Wait for the async execution to complete.
				// The HTTP Request node resolves the credential → injects Bearer token → calls Keycloak userinfo → 200
				const execution = await api.workflows.waitForExecution(workflowId, 15000);
				expect((execution as unknown as { status: string }).status).toBe('success');
			} finally {
				// Deactivate to prevent orphaned active webhooks after the test
				await api.workflows.deactivate(workflowId);
			}
		});
	},
);
