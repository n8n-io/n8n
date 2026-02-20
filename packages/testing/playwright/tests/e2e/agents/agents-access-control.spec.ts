import { nanoid } from 'nanoid';

import { test, expect } from './fixtures';

/**
 * Agent Access Control E2E Tests
 *
 * Verifies RBAC for the three agent access levels:
 * - external: any authenticated user can dispatch
 * - internal: admin or same-project member can dispatch (403 otherwise)
 * - closed: admin or same-project member can dispatch (404 otherwise, hides existence)
 *
 * These are API-only tests — no LLM key needed. A 200 response (even with
 * `{ status: 'error', message: 'No LLM API key' }`) proves the access check
 * passed, while 403/404 proves it was blocked.
 */

test.describe('Agent Access Control', () => {
	test.describe('external agents', () => {
		test('should allow admin to dispatch to external agent', async ({ api }) => {
			const agent = await api.agents.createAgent({
				firstName: `ExtAgent-${nanoid(8)}`,
				agentAccessLevel: 'external',
			});

			const response = await api.agents.dispatchTaskRaw(agent.id, 'Hello');
			expect(response.ok()).toBe(true);
		});

		test('should allow any authenticated member to dispatch to external agent', async ({ api }) => {
			const agent = await api.agents.createAgent({
				firstName: `ExtAgent-${nanoid(8)}`,
				agentAccessLevel: 'external',
			});

			const member = await api.publicApi.createUser({ role: 'global:member' });
			const memberApi = await api.createApiForUser(member);

			const response = await memberApi.agents.dispatchTaskRaw(agent.id, 'Hello');
			expect(response.ok()).toBe(true);
		});
	});

	test.describe('internal agents', () => {
		test('should allow admin to dispatch to internal agent', async ({ api }) => {
			const agent = await api.agents.createAgent({
				firstName: `IntAgent-${nanoid(8)}`,
				agentAccessLevel: 'internal',
			});

			const response = await api.agents.dispatchTaskRaw(agent.id, 'Hello');
			expect(response.ok()).toBe(true);
		});

		test('should allow same-project member to dispatch to internal agent', async ({ api }) => {
			await api.enableProjectFeatures();
			await api.setMaxTeamProjectsQuota(-1);

			const agent = await api.agents.createAgent({
				firstName: `IntAgent-${nanoid(8)}`,
				agentAccessLevel: 'internal',
			});

			const member = await api.publicApi.createUser({ role: 'global:member' });
			const memberApi = await api.createApiForUser(member);

			const project = await api.projects.createProject(`Shared-${nanoid(8)}`);
			await api.projects.addUserToProject(project.id, agent.id, 'project:editor');
			await api.projects.addUserToProject(project.id, member.id, 'project:editor');

			const response = await memberApi.agents.dispatchTaskRaw(agent.id, 'Hello');
			expect(response.ok()).toBe(true);
		});

		test('should block cross-project member from internal agent', async ({ api }) => {
			const agent = await api.agents.createAgent({
				firstName: `IntAgent-${nanoid(8)}`,
				agentAccessLevel: 'internal',
			});

			const member = await api.publicApi.createUser({ role: 'global:member' });
			const memberApi = await api.createApiForUser(member);

			const response = await memberApi.agents.dispatchTaskRaw(agent.id, 'Hello');
			expect(response.status()).toBe(403);
		});
	});

	test.describe('closed agents', () => {
		test('should allow admin to dispatch to closed agent', async ({ api }) => {
			const agent = await api.agents.createAgent({
				firstName: `ClosedAgent-${nanoid(8)}`,
				agentAccessLevel: 'closed',
			});

			const response = await api.agents.dispatchTaskRaw(agent.id, 'Hello');
			expect(response.ok()).toBe(true);
		});

		test('should allow same-project member to dispatch to closed agent', async ({ api }) => {
			await api.enableProjectFeatures();
			await api.setMaxTeamProjectsQuota(-1);

			const agent = await api.agents.createAgent({
				firstName: `ClosedAgent-${nanoid(8)}`,
				agentAccessLevel: 'closed',
			});

			const member = await api.publicApi.createUser({ role: 'global:member' });
			const memberApi = await api.createApiForUser(member);

			const project = await api.projects.createProject(`Shared-${nanoid(8)}`);
			await api.projects.addUserToProject(project.id, agent.id, 'project:editor');
			await api.projects.addUserToProject(project.id, member.id, 'project:editor');

			const response = await memberApi.agents.dispatchTaskRaw(agent.id, 'Hello');
			expect(response.ok()).toBe(true);
		});

		test('should return 404 for non-project member dispatching to closed agent', async ({
			api,
		}) => {
			const agent = await api.agents.createAgent({
				firstName: `ClosedAgent-${nanoid(8)}`,
				agentAccessLevel: 'closed',
			});

			const member = await api.publicApi.createUser({ role: 'global:member' });
			const memberApi = await api.createApiForUser(member);

			const response = await memberApi.agents.dispatchTaskRaw(agent.id, 'Hello');
			expect(response.status()).toBe(404);
		});
	});

	test.describe('external API key access', () => {
		test('should allow API key dispatch to external agent via public API', async ({
			api,
			ownerApiKey,
		}) => {
			const agent = await api.agents.createAgent({
				firstName: `ExtAgent-${nanoid(8)}`,
				agentAccessLevel: 'external',
			});

			const response = await api.agents.dispatchTaskViaPublicApiRaw(
				agent.id,
				'Hello',
				ownerApiKey.rawApiKey,
			);
			expect(response.ok()).toBe(true);
		});

		test('should block API key dispatch to internal agent when not in project', async ({ api }) => {
			const agent = await api.agents.createAgent({
				firstName: `IntAgent-${nanoid(8)}`,
				agentAccessLevel: 'internal',
			});

			const member = await api.publicApi.createUser({ role: 'global:member' });
			const memberApi = await api.createApiForUser(member);
			const memberApiKey = await memberApi.publicApi.createApiKey(`Member Key ${nanoid(8)}`);

			const response = await memberApi.agents.dispatchTaskViaPublicApiRaw(
				agent.id,
				'Hello',
				memberApiKey.rawApiKey,
			);
			expect(response.status()).toBe(403);
		});
	});
});
