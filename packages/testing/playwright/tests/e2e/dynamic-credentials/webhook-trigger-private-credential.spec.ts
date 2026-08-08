import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * E2E proving an `n8nOAuth2` webhook resolves end-user credentials *per caller*:
 * the identity in the bearer token decides which stored credential is used, not
 * the workflow's owner.
 *
 * The webhook path carries a reactive credential-status gate — once the trigger has
 * established the caller's identity, an unconnected private credential is answered
 * with 428 and a connect link instead of executing. So the same workflow and
 * credential yield opposite outcomes for two callers: the owner succeeds once
 * connected, while a member who never connected stays gated.
 *
 * `requireExecuteAccess: false` lets the member mint a token for the trigger
 * without holding `workflow:execute`.
 *
 * Uses the `dynamic-credentials` capability config (Keycloak as the credential's
 * OAuth2 provider, plus the seeded `system-n8n` resolver), inlined here rather
 * than reusing the named capability.
 */
test.use({
	capability: {
		services: ['keycloak'],
		env: {
			N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: 'true',
			N8N_DYNAMIC_CREDENTIALS_ENDPOINT_AUTH_TOKEN: 'e2e-test-endpoint-token',
		},
	},
	ignoreHTTPSErrors: true, // Keycloak uses a self-signed certificate
});

interface CredentialGateResponse {
	readyToExecute: boolean;
	credentials: Array<{ credentialName: string; status: string; authorizationUrl?: string }>;
}

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

				const callWebhook = async (accessToken: string, caller: string) =>
					await api.webhooks.trigger(`/webhook/${webhookPath!}`, {
						method: 'POST',
						headers: { Authorization: `Bearer ${accessToken}` },
						data: { caller },
					});

				// The owner has not connected the credential yet, so the gate answers 428
				// with a connect link rather than executing.
				const { tokens: ownerTokens } = await api.mcpOauth.completeAuthorizationCodeFlow({
					clientName: `webhook-private owner ${nanoid(8)}`,
					resource,
				});

				const gated = await callWebhook(ownerTokens.access_token, 'owner');
				expect(gated.status()).toBe(428);

				const gate = (await gated.json()) as CredentialGateResponse;
				expect(gate.readyToExecute).toBe(false);
				const missing = gate.credentials.find((c) => c.credentialName === credential.name);
				expect(missing?.status).toBe('missing');
				expect(missing?.authorizationUrl).toBeTruthy();
				expect(await api.workflows.getExecutions(workflowId)).toHaveLength(0);

				// The link is bound to the owner, so open it with the owner's session: n8n
				// redirects to Keycloak, and the callback stores the owner's tokens against
				// the resolver-keyed credential.
				const providerUrl = await api.dynamicCredentials.resolveProviderUrlFromAuthorizeLink(
					missing!.authorizationUrl!,
				);
				const callbackUrl = await keycloak.completeAuthorizationCodeFlow(providerUrl);
				await api.dynamicCredentials.completeAuthorizationCallback(callbackUrl);

				// Same token, same trigger — now the gate passes and the HTTP node resolves
				// the owner's credential against Keycloak.
				const ownerResponse = await callWebhook(ownerTokens.access_token, 'owner');
				expect(ownerResponse.status()).toBe(200);

				const ownerExecution = await api.workflows.waitForExecution(workflowId, 20_000);
				expect((ownerExecution as unknown as { status: string }).status).toBe('success');

				const executionsAfterOwner = (await api.workflows.getExecutions(workflowId)).length;

				// A member who never connected the credential is still gated on the very same
				// workflow and credential — the stored credential is keyed to the caller, not
				// to the workflow's owner.
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

				const memberResponse = await callWebhook(memberTokens.access_token, 'member');
				expect(memberResponse.status()).toBe(428);
				expect(((await memberResponse.json()) as CredentialGateResponse).readyToExecute).toBe(
					false,
				);
				expect(await api.workflows.getExecutions(workflowId)).toHaveLength(executionsAfterOwner);
			} finally {
				await api.workflows.deactivate(workflowId);
			}
		});
	},
);
