import type { ServiceHelpers } from 'n8n-containers/services/types';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';
import type { McpSession } from '../../../services/mcp-api-helper';

/**
 * E2E for the eager pre-execution credential-status gate on the MCP Server
 * Trigger (IAM-802). When a tool is called over `n8nOAuth2` MCP, the calling
 * user's private-credential status is checked on the request-handling main
 * before enqueue. If a required private credential is not connected for that
 * user, the tool call returns the connection URL instead of executing.
 *
 * Two legs, both proven on multi-main (the gate runs on the
 * request-handling-main-before-enqueue path):
 *   1. Not-ready — unconnected private credential → gate response, no execution.
 *   2. Happy path — connect the credential via the gate's authorization URL,
 *      retry, the workflow executes.
 *
 * All caller-token / PRM / tool-call traffic targets a specific main directly
 * (`createApiForMain(0)`) rather than the load balancer: minting the caller's
 * `n8nOAuth2` token needs the per-workflow protected resource to resolve
 * server-side (RFC 8707 resource indicator), which is registered asynchronously
 * after activation. We poll the per-resource metadata document on that main
 * until it is served, absorbing activation propagation.
 *
 * Requires the `dynamic-credentials` capability: it enables private credentials
 * (`N8N_ENV_FEAT_DYNAMIC_CREDENTIALS=true`, which seeds the `system-n8n`
 * resolver) and provides Keycloak as the credential's OAuth2 provider.
 */
test.use({
	capability: 'dynamic-credentials',
	ignoreHTTPSErrors: true, // Keycloak uses a self-signed certificate
});

interface GatedWorkflowSetup {
	mainApi: ApiHelpers;
	workflowId: string;
	mcpPath: string;
	authHeaders: Record<string, string>;
	session: McpSession;
}

/**
 * Provisions an active `n8nOAuth2` MCP-trigger workflow carrying an unconnected
 * resolvable OAuth2 credential, then mints a caller token scoped to the
 * workflow's protected resource and opens an authenticated MCP session — all
 * against a single confirmed-ready main. Each test calls this independently so
 * the legs stay parallel-safe (own credential, trigger path and caller token).
 */
async function provisionGatedWorkflow(
	api: ApiHelpers,
	services: ServiceHelpers,
	createApiForMain: (mainIndex: number) => Promise<ApiHelpers>,
): Promise<GatedWorkflowSetup> {
	const keycloak = services.keycloak;
	const externalBase = keycloak.discoveryUrl.replace('/.well-known/openid-configuration', '');
	const internalBase = keycloak.internalDiscoveryUrl.replace(
		'/.well-known/openid-configuration',
		'',
	);

	// A resolvable OAuth2 credential — resolved per-user by the seeded `system-n8n`
	// resolver. The caller has NOT connected it, so the gate reports it missing and
	// hands back the Keycloak authorization URL to connect it.
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

	const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
		'mcp-trigger/mcp-trigger-n8n-oauth2-private-cred.json',
		{
			transform: (wf) => {
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

	const mainApi = await createApiForMain(0);

	// importWorkflowFromFile makes the MCP trigger path unique (appends a suffix
	// and sets the webhookId that isFullPath webhooks require), so read the
	// registered path back from the created workflow rather than the fixture value.
	const mcpNode = createdWorkflow.nodes?.find((n) => n.type.includes('mcpTrigger'));
	const triggerPath = mcpNode?.parameters.path as string;
	const mcpPath = `mcp/${triggerPath}`;

	// The per-workflow resource URL is the caller token's audience. The protected
	// resource is registered when the trigger's webhook is, which is asynchronous
	// after activation (notably multi-main), so poll the per-resource metadata
	// document until it is served.
	let resource = '';
	await expect
		.poll(
			async () => {
				const response = await mainApi.mcpOauth.getProtectedResourceMetadata(mcpPath);
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
	const { tokens } = await mainApi.mcpOauth.completeAuthorizationCodeFlow({
		clientName: `mcp-gate e2e ${nanoid(8)}`,
		resource,
	});
	const authHeaders = { Authorization: `Bearer ${tokens.access_token}` };

	const session = await mainApi.mcp.streamableHttpInitialize(mcpPath, { headers: authHeaders });

	return { mainApi, workflowId, mcpPath, authHeaders, session };
}

test.describe(
	'MCP Trigger credential gate @capability:dynamic-credentials @licensed @mode:multi-main',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.beforeEach(async ({ api, mainUrls }) => {
			test.skip(mainUrls.length < 1, 'Requires a directly-addressable main');
			// The OAuth endpoints (register/authorize/token) require MCP access.
			await api.setMcpAccess(true);
		});

		test('should return connection URLs instead of executing when a private credential is not connected @auth:owner', async ({
			api,
			services,
			createApiForMain,
		}) => {
			const { mainApi, workflowId, mcpPath, authHeaders, session } = await provisionGatedWorkflow(
				api,
				services,
				createApiForMain,
			);

			try {
				const result = await mainApi.mcp.callTool(
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

		test('should execute the tool after the caller connects the private credential @auth:owner', async ({
			api,
			services,
			createApiForMain,
		}) => {
			const { mainApi, workflowId, mcpPath, authHeaders, session } = await provisionGatedWorkflow(
				api,
				services,
				createApiForMain,
			);

			try {
				// First call hits the gate and returns an n8n authorize link
				// (`/rest/credentials/:id/authorize?token=…`), bound to the owner.
				const gateResult = await mainApi.mcp.callTool(
					session,
					mcpPath,
					'echo',
					{ message: 'hi' },
					{ headers: authHeaders },
				);
				expect(gateResult.isError).toBe(true);
				const gateText = gateResult.content.map((c) => c.text).join('\n');
				const authorizationUrl = gateText.split('\n').find((line) => line.startsWith('http'));
				expect(authorizationUrl).toBeTruthy();

				// The authorize link is owner-bound, so open it with the owner's authenticated
				// context: n8n resolves the intent and redirects to the Keycloak authorization
				// URL. Then complete the Keycloak flow and GET the n8n callback (on the same
				// main) so n8n exchanges the code and stores the caller's token for the
				// resolver-keyed private credential.
				const providerUrl = await mainApi.dynamicCredentials.resolveProviderUrlFromAuthorizeLink(
					authorizationUrl!,
				);
				const n8nCallbackUrl = await services.keycloak.completeAuthorizationCodeFlow(providerUrl);
				await mainApi.dynamicCredentials.completeAuthorizationCallback(n8nCallbackUrl);

				// Retry with the same caller token: the credential is now connected, the
				// gate passes, and the echo tool executes.
				const retryResult = await mainApi.mcp.callTool(
					session,
					mcpPath,
					'echo',
					{ message: 'hi' },
					{ headers: authHeaders },
				);
				expect(retryResult.isError).toBeFalsy();
				const retryText = retryResult.content.map((c) => c.text).join('\n');
				expect(retryText).toContain('Echo: hi');

				// And the workflow executed.
				await expect
					.poll(async () => (await api.workflows.getExecutions(workflowId)).length, {
						timeout: 10_000,
					})
					.toBeGreaterThan(0);
			} finally {
				await api.workflows.deactivate(workflowId);
			}
		});
	},
);
