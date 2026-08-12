import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

/**
 * E2E for the Webhook node's `n8nOAuth2` authentication: a production webhook
 * becomes an OAuth 2.1 protected resource served by n8n's own authorization
 * server, and only a bearer token whose audience names that trigger may call it.
 *
 * The method being served is part of the resource URL (`?method=POST`), since one
 * path can host several triggers as long as their methods are disjoint.
 */
interface ProtectedWebhook {
	workflowId: string;
	versionId: string;
	webhookPath: string;
	/** Canonical RFC 8707 resource URL, method selector included. */
	resource: string;
}

/**
 * Creates and activates a workflow whose Webhook node requires an `n8nOAuth2`
 * bearer token, then waits for its protected resource to be published.
 */
async function createProtectedWebhook(api: ApiHelpers): Promise<ProtectedWebhook> {
	const { workflowId, webhookPath, createdWorkflow } =
		await api.workflows.createWorkflowFromDefinition({
			name: `Webhook n8nOAuth2 ${nanoid()}`,
			nodes: [
				{
					// `path` is replaced with a unique value by createWorkflowFromDefinition
					parameters: {
						httpMethod: 'POST',
						path: 'webhook-oauth2',
						authentication: 'n8nOAuth2',
						options: {},
					},
					id: nanoid(),
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2.1,
					position: [0, 0],
				},
			],
			connections: {},
		});

	const versionId = createdWorkflow.versionId as string;
	await api.workflows.activate(workflowId, versionId);

	// The resource is registered together with the trigger's webhook, which is
	// asynchronous after activation, so poll the per-resource metadata document.
	// Its `resource` field is the audience a caller token must carry.
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

	expect(resource).toContain(webhookPath!);
	expect(resource).toContain('?method=POST');

	return { workflowId, versionId, webhookPath: webhookPath!, resource };
}

/** Mints a token scoped to the given protected resource, with the owner consenting. */
async function mintTokenFor(api: ApiHelpers, resource: string): Promise<string> {
	const { tokens } = await api.mcpOauth.completeAuthorizationCodeFlow({
		clientName: `webhook-oauth2 e2e ${nanoid(8)}`,
		resource,
	});
	return tokens.access_token;
}

test.describe(
	'Webhook Trigger n8nOAuth2 authentication',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.beforeEach(async ({ api }) => {
			// The OAuth endpoints (register/authorize/token) require MCP access.
			await api.setMcpAccess(true);
		});

		test('should challenge an unauthenticated request and not execute @auth:owner', async ({
			api,
		}) => {
			const { workflowId, webhookPath } = await createProtectedWebhook(api);

			try {
				const response = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
					data: { hello: 'world' },
				});

				expect(response.status()).toBe(401);

				// RFC 9728: the challenge points the client at this trigger's metadata
				// document, method selector included, so it can discover where to get a
				// token and for which audience.
				const challenge = response.headers()['www-authenticate'];
				expect(challenge).toContain('Bearer realm="n8n Webhook"');
				expect(challenge).toContain(
					`/.well-known/oauth-protected-resource/webhook/${webhookPath}?method=POST`,
				);

				expect(await api.workflows.getExecutions(workflowId)).toHaveLength(0);
			} finally {
				await api.workflows.deactivate(workflowId);
			}
		});

		test('should execute when called with a token scoped to the trigger @auth:owner', async ({
			api,
		}) => {
			const { workflowId, webhookPath, resource } = await createProtectedWebhook(api);

			try {
				const accessToken = await mintTokenFor(api, resource);

				const response = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
					headers: { Authorization: `Bearer ${accessToken}` },
					data: { hello: 'world' },
				});

				expect(response.status()).toBe(200);

				const execution = await api.workflows.waitForExecution(workflowId, 15_000);
				expect((execution as unknown as { status: string }).status).toBe('success');
			} finally {
				await api.workflows.deactivate(workflowId);
			}
		});

		test('should reject a token minted for a different webhook trigger @auth:owner', async ({
			api,
		}) => {
			// Per-trigger scoping is the point of the resource indicator: a token is
			// bound to the trigger it was consented for and cannot be replayed at another.
			const target = await createProtectedWebhook(api);
			const other = await createProtectedWebhook(api);

			try {
				const otherToken = await mintTokenFor(api, other.resource);

				const response = await api.webhooks.trigger(`/webhook/${target.webhookPath}`, {
					method: 'POST',
					headers: { Authorization: `Bearer ${otherToken}` },
					data: { hello: 'world' },
				});

				expect(response.status()).toBe(401);
				expect(await api.workflows.getExecutions(target.workflowId)).toHaveLength(0);
			} finally {
				await api.workflows.deactivate(target.workflowId);
				await api.workflows.deactivate(other.workflowId);
			}
		});
	},
);
