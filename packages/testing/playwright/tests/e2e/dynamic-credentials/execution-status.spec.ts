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
 * Tests for the execution-status endpoint: external (marketplace) users
 * checking whether their credentials are configured for a given workflow.
 *
 * Architecture under test:
 *   External user → GET /rest/workflows/:id/execution-status
 *     → X-Authorization authenticates the request to n8n
 *     → Bearer token extracted from Authorization header for credential context
 *     → Token validated against Keycloak (userinfo endpoint)
 *     → Credential status returned (missing / configured)
 */
test.describe(
	'Dynamic Credentials: execution-status @capability:dynamic-credentials',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		/**
		 * Happy path: external user calls execution-status with a valid Keycloak bearer token.
		 * The credential is not yet authorized for that user → status should be "missing"
		 * and an authorizationUrl should be provided to start the OAuth2 flow.
		 */
		test('should report credentials as missing for a new external user @auth:owner', async ({
			api,
			services,
		}) => {
			const keycloak = services.keycloak;

			// Create an OAuth2 resolver that validates tokens via Keycloak's userinfo endpoint.
			// Uses the internal URL so the n8n container can reach Keycloak directly.
			const resolver = await api.dynamicCredentials.createResolver({
				name: `Keycloak Resolver ${nanoid()}`,
				type: 'credential-resolver.oauth2-1.0',
				config: {
					metadataUri: keycloak.internalDiscoveryUrl,
					validation: 'oauth2-userinfo',
				},
			});

			// Create an OAuth2 credential flagged as resolvable (no static data needed)
			const credential = await api.credentials.createCredential({
				name: `Resolvable OAuth2 Credential ${nanoid()}`,
				type: 'oAuth2Api',
				data: { grantType: 'authorizationCode' },
				isResolvable: true,
			});

			// Create a workflow that uses that credential, with the resolver as workflow-level fallback
			const workflow = await api.workflows.createWorkflow({
				name: `Dynamic Credential Workflow ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [0, 0] as [number, number],
						parameters: {},
						credentials: {
							oAuth2Api: { id: credential.id, name: credential.name },
						},
					},
				],
				connections: {},
				settings: {
					// Workflow-level resolver used as fallback for all resolvable credentials
					credentialResolverId: resolver.id,
				},
			});

			// Obtain a real access token for the Keycloak test user via ROPC (no browser needed)
			const accessToken = await keycloak.getAccessToken(
				keycloak.testUser.email,
				keycloak.testUser.password,
			);

			// External (unauthenticated) call:
			// - X-Authorization authenticates the request to n8n
			// - Authorization: Bearer provides the user identity for credential resolution
			const status = await api.dynamicCredentials.getExecutionStatus(workflow.id, {
				bearerToken: accessToken,
				endpointToken: DYNAMIC_CRED_ENDPOINT_TOKEN,
			});

			expect(status.workflowId).toBe(workflow.id);
			expect(status.readyToExecute).toBe(false);
			expect(status.credentials).toHaveLength(1);

			const credentialStatus = status.credentials![0];
			expect(credentialStatus.credentialId).toBe(credential.id);
			expect(credentialStatus.credentialStatus).toBe('missing');
			expect(credentialStatus.credentialType).toBe('oAuth2Api');

			// authorizationUrl must be present so the user can start the OAuth2 authorization flow
			expect(credentialStatus.authorizationUrl).toBeTruthy();
			expect(credentialStatus.authorizationUrl).toContain(credential.id);
			expect(credentialStatus.authorizationUrl).toContain('authorize');

			// revokeUrl must also be present
			expect(credentialStatus.revokeUrl).toBeTruthy();
			expect(credentialStatus.revokeUrl).toContain(credential.id);
			expect(credentialStatus.revokeUrl).toContain('revoke');
		});

		/**
		 * Happy path: external user has already completed the OAuth2 authorization flow.
		 * The credential is stored in dynamic_credential_entry for this user →
		 * readyToExecute should be true and credentialStatus should be "configured".
		 */
		test('should report ready when workflow has resolvable credentials with existing entries for user @auth:owner', async ({
			api,
			services,
		}) => {
			const keycloak = services.keycloak;

			const externalBase = keycloak.discoveryUrl.replace('/.well-known/openid-configuration', '');
			const internalBase = keycloak.internalDiscoveryUrl.replace(
				'/.well-known/openid-configuration',
				'',
			);

			// Obtain a Keycloak access token for the test user (ROPC — no browser needed)
			const accessToken = await keycloak.getAccessToken(
				keycloak.testUser.email,
				keycloak.testUser.password,
			);

			// Create an OAuth2 resolver that validates tokens via Keycloak's userinfo endpoint
			const resolver = await api.dynamicCredentials.createResolver({
				name: `Keycloak Resolver ${nanoid()}`,
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

			// Create a workflow that uses that credential
			const workflow = await api.workflows.createWorkflow({
				name: `Configured Credential Workflow ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [0, 0] as [number, number],
						parameters: {},
						credentials: {
							oAuth2Api: { id: credential.id, name: credential.name },
						},
					},
				],
				connections: {},
				settings: {
					credentialResolverId: resolver.id,
				},
			});

			// Complete the OAuth2 authorization code flow for the test user.
			// This stores the user's Keycloak tokens in the dynamic_credential_entry table.
			const keycloakAuthUrl = await api.dynamicCredentials.getAuthorizationUrl(
				credential.id,
				resolver.id,
				accessToken,
			);
			const n8nCallbackUrl = await keycloak.completeAuthorizationCodeFlow(keycloakAuthUrl);
			// GET the n8n callback with the owner session: n8n exchanges the code and stores tokens
			await api.request.get(n8nCallbackUrl);

			// Credential is now configured for this user → readyToExecute should be true
			const status = await api.dynamicCredentials.getExecutionStatus(workflow.id, {
				bearerToken: accessToken,
				endpointToken: DYNAMIC_CRED_ENDPOINT_TOKEN,
			});

			expect(status.workflowId).toBe(workflow.id);
			expect(status.readyToExecute).toBe(true);
			expect(status.credentials).toHaveLength(1);
			expect(status.credentials![0].credentialStatus).toBe('configured');
		});
	},
);
