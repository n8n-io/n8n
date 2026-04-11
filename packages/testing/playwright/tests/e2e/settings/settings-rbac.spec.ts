import { test, expect } from '../../../fixtures/base';

/**
 * E2E tests for instance-level settings RBAC (N8N-9853).
 *
 * Verifies that members cannot access admin-only settings pages:
 * - /settings/resolvers (Credential resolvers)
 * - /settings/mcp (Instance-level MCP settings)
 *
 * These pages should only be accessible to users with admin/owner roles.
 */

test.describe(
	'Settings RBAC - Member Access Control',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should prevent members from accessing credential resolvers page', async ({
			n8n,
			api,
		}) => {
			// Create a member user
			const member = await api.users.create({
				role: 'global:member',
			});

			// Get isolated browser context for member
			const memberN8n = await n8n.start.withUser(member);

			// Attempt to navigate to credential resolvers page
			await memberN8n.page.goto('/settings/resolvers');

			// Member should be redirected away from the page
			// Either to home/workflows or see an access denied message
			await expect(memberN8n.page).not.toHaveURL(/\/settings\/resolvers/);
		});

		test('should prevent members from accessing instance MCP settings page', async ({
			n8n,
			api,
		}) => {
			// Create a member user
			const member = await api.users.create({
				role: 'global:member',
			});

			// Get isolated browser context for member
			const memberN8n = await n8n.start.withUser(member);

			// Attempt to navigate to MCP settings page
			await memberN8n.page.goto('/settings/mcp');

			// Member should be redirected away from the page
			// Either to home/workflows or see an access denied message
			await expect(memberN8n.page).not.toHaveURL(/\/settings\/mcp/);
		});

		test('should allow owners to access credential resolvers page', async ({ n8n }) => {
			// Owner should be able to access the page
			await n8n.page.goto('/settings/resolvers');

			// Should remain on the resolvers page
			await expect(n8n.page).toHaveURL(/\/settings\/resolvers/);
		});

		test('should allow owners to access instance MCP settings page', async ({ n8n }) => {
			// Owner should be able to access the page
			await n8n.page.goto('/settings/mcp');

			// Should remain on the MCP settings page
			await expect(n8n.page).toHaveURL(/\/settings\/mcp/);
		});
	},
);
