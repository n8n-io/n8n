import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * E2E for the eager pre-execution credential-status gate on the MCP Server
 * Trigger (IAM-802).
 *
 * Scope: the "not-ready" leg only. When a workflow triggered over `n8nOAuth2`
 * MCP has a private (resolvable) credential the calling user has not connected,
 * a tool call must return the connection URLs in the tool response instead of
 * executing the workflow.
 *
 * The "connect → retry → success" leg is intentionally NOT covered here — it
 * needs a per-user private-credential connect helper that does not yet exist in
 * the e2e harness (tracked as a follow-up).
 *
 * Requires the `dynamic-credentials` capability: it enables private credentials
 * (`N8N_ENV_FEAT_DYNAMIC_CREDENTIALS=true`, which seeds the `system-n8n`
 * resolver) and provides Keycloak for a realistic OAuth2 credential config.
 */
test.use({
	capability: 'dynamic-credentials',
	ignoreHTTPSErrors: true, // Keycloak uses a self-signed certificate
});

test.describe(
	'MCP Trigger credential gate @capability:dynamic-credentials @licensed',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.beforeEach(async ({ api }) => {
			// The OAuth endpoints (register/authorize/token) require MCP access.
			await api.setMcpAccess(true);
		});

		test('should return connection URLs instead of executing when a private credential is not connected @auth:owner', async ({
			api,
			services,
		}) => {
			const keycloak = services.keycloak;
			const externalBase = keycloak.discoveryUrl.replace('/.well-known/openid-configuration', '');
			const internalBase = keycloak.internalDiscoveryUrl.replace(
				'/.well-known/openid-configuration',
				'',
			);

			// A resolvable OAuth2 credential — resolved per-user via the seeded
			// `system-n8n` resolver (private credentials). The owner has NOT connected
			// it, so the gate will report it missing and hand back its connection URL.
			const credential = await api.credentials.createCredential({
				name: `MCP Private OAuth2 ${nanoid()}`,
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

			// Unique trigger path so parallel workers don't collide on the webhook.
			const triggerPath = `mcp-oauth-gate-${nanoid(8)}`;

			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'mcp-trigger/mcp-trigger-n8n-oauth2-private-cred.json',
				{
					transform: (wf) => {
						const mcpNode = wf.nodes?.find((n) => n.type.includes('mcpTrigger'));
						if (mcpNode) {
							mcpNode.parameters = { ...mcpNode.parameters, path: triggerPath };
						}
						// Attach the resolvable credential to the Private API node so the
						// workflow carries an unconnected private credential.
						const privateApiNode = wf.nodes?.find((n) => n.name === 'Private API');
						if (privateApiNode) {
							privateApiNode.credentials = {
								oAuth2Api: { id: credential.id, name: credential.name },
							};
						}
						return wf;
					},
				},
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			try {
				const mcpPath = `mcp/${triggerPath}`;

				// The canonical per-workflow resource URL is the token's audience. The
				// protected resource is registered when the trigger's webhook is, which
				// is asynchronous after activation (notably multi-main), so poll until
				// the metadata document is served.
				let resource = '';
				await expect
					.poll(
						async () => {
							const response = await api.mcpOauth.getProtectedResourceMetadata(mcpPath);
							if (response.status() === 200) {
								resource = ((await response.json()) as { resource: string }).resource;
							}
							return response.status();
						},
						{ timeout: 20_000, intervals: [500, 1000, 2000] },
					)
					.toBe(200);
				expect(resource).toContain(triggerPath);

				// Mint an n8n OAuth token scoped to this workflow (owner consents).
				const { tokens } = await api.mcpOauth.completeAuthorizationCodeFlow({
					clientName: `mcp-gate e2e ${nanoid(8)}`,
					resource,
				});
				const authHeaders = { Authorization: `Bearer ${tokens.access_token}` };

				// Authenticated MCP session, then call a tool.
				const session = await api.mcp.streamableHttpInitialize(mcpPath, { headers: authHeaders });
				const result = await api.mcp.callTool(
					session,
					mcpPath,
					'echo',
					{ message: 'hi' },
					{ headers: authHeaders },
				);

				// The gate fired: an actionable error response, not the echoed message.
				expect(result.isError).toBe(true);
				const text = result.content.map((c) => c.text).join('\n');
				expect(text).toContain('not connected');
				expect(text).not.toContain('Echo: hi');

				// And the workflow did not execute.
				const executions = await api.workflows.getExecutions(workflowId);
				expect(executions).toHaveLength(0);
			} finally {
				await api.workflows.deactivate(workflowId);
			}
		});
	},
);
