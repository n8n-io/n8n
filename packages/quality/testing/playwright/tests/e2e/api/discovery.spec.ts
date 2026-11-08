import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'API Discovery',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('owner sees all available operations', async ({ api }) => {
			const discovery = await api.publicApi.getDiscovery();

			expect(discovery.scopes.length).toBeGreaterThan(0);
			expect(discovery.resources).toBeDefined();
			expect(discovery.specUrl).toBe('/api/v1/openapi.yml');

			// Owner's default scopes include workflow endpoints
			expect(discovery.resources.workflow).toBeDefined();
			expect(discovery.resources.workflow.endpoints.length).toBeGreaterThan(0);
		});

		test('every endpoint has method, path, and operationId', async ({ api }) => {
			const discovery = await api.publicApi.getDiscovery();

			for (const [, resource] of Object.entries(discovery.resources)) {
				for (const endpoint of resource.endpoints) {
					expect(endpoint.method).toMatch(/^(GET|POST|PUT|DELETE|PATCH)$/);
					expect(endpoint.path).toMatch(/^\/api\/v1\//);
					expect(endpoint.operationId).toBeTruthy();
				}
			}
		});

		test('member can discover API capabilities', async ({ api }) => {
			const member = await api.publicApi.createUser({
				email: `member-discover-${nanoid()}@test.com`,
				role: 'global:member',
			});

			const memberApi = await api.createApiForUser(member);
			await memberApi.publicApi.createApiKey(`member-key-${nanoid()}`, [
				'workflow:create',
				'workflow:read',
				'workflow:list',
				'credential:create',
			]);

			const discovery = await memberApi.publicApi.getDiscovery();

			expect(discovery.scopes.length).toBeGreaterThan(0);
			expect(discovery.resources).toBeDefined();
			expect(discovery.specUrl).toBe('/api/v1/openapi.yml');

			// Member should see workflow endpoints (included in default API key scopes)
			expect(discovery.resources.workflow).toBeDefined();
			expect(
				discovery.resources.workflow.endpoints.some((e) => e.operationId === 'getWorkflows'),
			).toBe(true);
		});

		test('discovery includes known endpoints with correct shape', async ({ api }) => {
			const discovery = await api.publicApi.getDiscovery();

			// Verify well-known endpoints are correctly described
			const workflowList = discovery.resources.workflow?.endpoints.find(
				(e) => e.operationId === 'getWorkflows',
			);
			expect(workflowList).toEqual({
				method: 'GET',
				path: '/api/v1/workflows',
				operationId: 'getWorkflows',
			});

			const createTag = discovery.resources.tags?.endpoints.find(
				(e) => e.operationId === 'createTag',
			);
			expect(createTag).toEqual({
				method: 'POST',
				path: '/api/v1/tags',
				operationId: 'createTag',
			});
		});
	},
);
