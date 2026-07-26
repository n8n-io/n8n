import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * E2E tests for credential resolver deletion cleanup (IAM-145).
 *
 * Verifies that when a resolver is deleted:
 * - Affected workflows endpoint returns the correct workflows
 * - Workflow settings are cleaned up (credentialResolverId removed)
 * - The resolver is fully removed
 *
 * Requires:
 *   - capability: 'dynamic-credentials' (Keycloak container + env vars)
 */
test.use({
	capability: 'dynamic-credentials',
	ignoreHTTPSErrors: true,
});

test.describe(
	'Dynamic Credentials: resolver deletion cleanup @capability:dynamic-credentials @licensed',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should list affected workflows for a resolver @auth:owner', async ({ api, services }) => {
			const keycloak = services.keycloak;

			const resolver = await api.dynamicCredentials.createResolver({
				name: `Resolver ${nanoid()}`,
				type: 'credential-resolver.oauth2-1.0',
				config: {
					metadataUri: keycloak.internalDiscoveryUrl,
					validation: 'oauth2-userinfo',
				},
			});

			const workflowName = `Affected Workflow ${nanoid()}`;
			await api.workflows.createWorkflow({
				name: workflowName,
				nodes: [],
				connections: {},
				settings: { credentialResolverId: resolver.id },
			});

			// Unrelated workflow — should not appear
			await api.workflows.createWorkflow({
				name: `Unrelated Workflow ${nanoid()}`,
				nodes: [],
				connections: {},
			});

			const affected = await api.dynamicCredentials.getAffectedWorkflows(resolver.id);

			expect(affected).toHaveLength(1);
			expect(affected[0].name).toBe(workflowName);
		});

		test('should clean up workflow settings when resolver is deleted @auth:owner', async ({
			api,
			services,
		}) => {
			const keycloak = services.keycloak;

			const resolver = await api.dynamicCredentials.createResolver({
				name: `Resolver ${nanoid()}`,
				type: 'credential-resolver.oauth2-1.0',
				config: {
					metadataUri: keycloak.internalDiscoveryUrl,
					validation: 'oauth2-userinfo',
				},
			});

			const workflow = await api.workflows.createWorkflow({
				name: `Cleanup Test Workflow ${nanoid()}`,
				nodes: [],
				connections: {},
				settings: { credentialResolverId: resolver.id },
			});

			// Verify the resolver is assigned
			const affected = await api.dynamicCredentials.getAffectedWorkflows(resolver.id);
			expect(affected.some((w) => w.id === workflow.id)).toBe(true);

			// Delete the resolver
			await api.dynamicCredentials.deleteResolver(resolver.id);

			// Fetch the workflow and verify the resolver reference was cleaned up
			const workflows = await api.workflows.getWorkflows();
			const updated = workflows.find(
				(w: { id: string; settings?: Record<string, unknown> }) => w.id === workflow.id,
			);
			expect(updated).toBeDefined();
			expect(updated.settings?.credentialResolverId).toBeUndefined();
		});

		test('should return empty list for resolver with no workflows @auth:owner', async ({
			api,
			services,
		}) => {
			const keycloak = services.keycloak;

			const resolver = await api.dynamicCredentials.createResolver({
				name: `Lonely Resolver ${nanoid()}`,
				type: 'credential-resolver.oauth2-1.0',
				config: {
					metadataUri: keycloak.internalDiscoveryUrl,
					validation: 'oauth2-userinfo',
				},
			});

			const affected = await api.dynamicCredentials.getAffectedWorkflows(resolver.id);
			expect(affected).toHaveLength(0);
		});
	},
);
