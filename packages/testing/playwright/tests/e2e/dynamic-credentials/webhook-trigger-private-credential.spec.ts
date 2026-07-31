import { SYSTEM_RESOLVER_ID } from '@n8n/api-types';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * E2E proving an `n8nOAuth2` webhook runs *as the caller*: the private credential
 * its HTTP Request node uses is resolved per-user, keyed to the identity in the
 * bearer token rather than to the workflow's owner.
 *
 * One workflow, one credential, two callers, opposite outcomes — the member has
 * not connected the credential so their run fails, while the owner's succeeds
 * once connected. `requireExecuteAccess: false` lets the member mint a token for
 * the trigger without holding `workflow:execute`.
 *
 * Combines the `dynamic-credentials` capability (Keycloak as the credential's
 * OAuth2 provider, plus the seeded `system-n8n` resolver) with the webhook
 * protected-resource flag, so the config is inlined rather than reusing the
 * named capability.
 */
test.use({
	capability: {
		services: ['keycloak'],
		env: {
			N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: 'true',
			N8N_ENV_FEAT_WEBHOOK_PRIVATE_CREDENTIALS: 'true',
			N8N_DYNAMIC_CREDENTIALS_ENDPOINT_AUTH_TOKEN: 'e2e-test-endpoint-token',
		},
	},
	ignoreHTTPSErrors: true, // Keycloak uses a self-signed certificate
});

test.describe(
	'Webhook Trigger n8nOAuth2 private credentials @capability:dynamic-credentials @licensed',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test("should resolve the calling user's private credential, not the owner's @auth:owner", async ({
			api,
			services,
		}) => {
			// The OAuth endpoints (register/authorize/token) require MCP access.
			await api.setMcpAccess(true);

			const keycloak = services.keycloak;
			// authUrl is the EXTERNAL URL (this machine follows the redirect); the token
			// URL is INTERNAL (n8n exchanges the code server-to-server).
			const externalBase = keycloak.discoveryUrl.replace('/.well-known/openid-configuration', '');
			const internalBase = keycloak.internalDiscoveryUrl.replace(
				'/.well-known/openid-configuration',
				'',
			);

			// Resolvable: the seeded `system-n8n` resolver stores its tokens per n8n user.
			const credential = await api.credentials.createCredential({
				name: `Webhook Private OAuth2 ${nanoid()}`,
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

			const { workflowId, webhookPath, createdWorkflow } =
				await api.workflows.createWorkflowFromDefinition({
					name: `Webhook n8nOAuth2 Private Credential ${nanoid()}`,
					nodes: [
						{
							id: nanoid(),
							name: 'Webhook',
							type: 'n8n-nodes-base.webhook',
							typeVersion: 2.1,
							position: [0, 0] as [number, number],
							parameters: {
								httpMethod: 'POST',
								path: 'placeholder', // replaced with a unique value on create
								authentication: 'n8nOAuth2',
								// Any authenticated user may mint a token, so the member can call
								// the trigger without being granted workflow:execute.
								requireExecuteAccess: false,
								responseMode: 'onReceived', // respond immediately; execution runs async
								options: {},
							},
						},
						{
							id: nanoid(),
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [200, 0] as [number, number],
							parameters: {
								// Keycloak userinfo accepts the resolved Bearer token and returns 200
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
						Webhook: { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] },
					},
				});

			await api.workflows.activate(workflowId, createdWorkflow.versionId as string);

			try {
				// The protected resource is registered with the trigger's webhook,
				// asynchronously after activation.
				let resource = '';
				await expect
					.poll(
						async () => {
							const response = await api.mcpOauth.getProtectedResourceMetadata(
								`webhook/${webhookPath!}?method=POST`,
							);
							if (response.status() === 200) {
								resource = ((await response.json()) as { resource: string }).resource;
							}
							return response.status();
						},
						{ timeout: 20_000, intervals: [500, 1000, 2000] },
					)
					.toBe(200);

				// Leg 1 — a member who has never connected the credential. The run reaches
				// the HTTP node, which cannot resolve a credential for them, and fails.
				const member = await api.publicApi.createUser({
					email: `webhook-oauth2-member-${nanoid(8)}@test.com`,
					firstName: 'Webhook',
					lastName: 'Member',
					role: 'global:member',
				});
				const memberApi = await api.createApiForUser(member);
				const { tokens: memberTokens } = await memberApi.mcpOauth.completeAuthorizationCodeFlow({
					clientName: `webhook-private member ${nanoid(8)}`,
					resource,
				});

				const memberResponse = await api.webhooks.trigger(`/webhook/${webhookPath!}`, {
					method: 'POST',
					headers: { Authorization: `Bearer ${memberTokens.access_token}` },
					data: { caller: 'member' },
				});
				expect(memberResponse.status()).toBe(200); // onReceived — the run fails afterwards

				const memberExecution = await api.workflows.waitForExecution(workflowId, 20_000);
				expect((memberExecution as unknown as { status: string }).status).toBe('error');

				// Leg 2 — the owner connects the credential for themselves, then calls the
				// same trigger with their own token.
				const { tokens: ownerTokens } = await api.mcpOauth.completeAuthorizationCodeFlow({
					clientName: `webhook-private owner ${nanoid(8)}`,
					resource,
				});

				const providerUrl = await api.dynamicCredentials.getAuthorizationUrl(
					credential.id,
					SYSTEM_RESOLVER_ID,
					ownerTokens.access_token,
				);
				const callbackUrl = await keycloak.completeAuthorizationCodeFlow(providerUrl);
				await api.dynamicCredentials.completeAuthorizationCallback(callbackUrl);

				const ownerResponse = await api.webhooks.trigger(`/webhook/${webhookPath!}`, {
					method: 'POST',
					headers: { Authorization: `Bearer ${ownerTokens.access_token}` },
					data: { caller: 'owner' },
				});
				expect(ownerResponse.status()).toBe(200);

				const ownerExecution = await api.workflows.waitForExecution(workflowId, 20_000);
				expect((ownerExecution as unknown as { status: string }).status).toBe('success');
			} finally {
				await api.workflows.deactivate(workflowId);
			}
		});
	},
);
