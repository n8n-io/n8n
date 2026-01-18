import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';

test.describe('User API Service', () => {
	test.describe('Internal API (Cookie Auth)', () => {
		test('should create a user with default values', async ({ api }) => {
			const user = await api.users.create();

			expect(user.email).toContain('testuser');
			expect(user.email).toContain('@test.com');
			expect(user.firstName).toBe('Test');
			expect(user.lastName).toContain('User');
			expect(user.role).toContain('member');
		});

		test('should create a user with custom values', async ({ api }) => {
			const customEmail = `custom-${nanoid()}@test.com`;
			const customPassword = 'CustomPass123!';

			const user = await api.users.create({
				email: customEmail,
				password: customPassword,
				firstName: 'John',
				lastName: 'Doe',
				role: 'global:member',
			});

			expect(user.email.toLowerCase()).toBe(customEmail.toLowerCase());
			expect(user.firstName).toBe('John');
			expect(user.lastName).toBe('Doe');
			expect(user.role).toContain('member');
		});

		test('should create a member user by default', async ({ api }) => {
			const user = await api.users.create();

			expect(user.role).toContain('member');
			expect(user.role).toBe('global:member');
		});

		test('should maintain separate sessions for multiple users', async ({ n8n, api }) => {
			await n8n.navigate.toPersonalSettings();
			const user = await api.users.create();

			await n8n.page.reload();
			await expect(n8n.settingsPersonal.getUserRole()).toHaveText('Owner');

			// New user page should have test name
			const memberN8n = await n8n.start.withUser(user);

			await memberN8n.navigate.toPersonalSettings();
			await expect(memberN8n.settingsPersonal.getUserRole()).toHaveText('Member');

			// n8n main should still have owner context
			await n8n.page.reload();
			await expect(n8n.settingsPersonal.getUserRole()).toHaveText('Owner');

			// user page should still have member role
			await memberN8n.page.reload();
			await expect(memberN8n.settingsPersonal.getUserRole()).toHaveText('Member');
		});
	});

	test.describe('Public API (API Key Auth)', () => {
		test('should create an API key', async ({ api }) => {
			const label = `Test Key ${nanoid()}`;
			const apiKey = await api.publicApi.createApiKey(label);

			expect(apiKey.label).toBe(label);
			expect(apiKey.rawApiKey).toBeDefined();
			expect(apiKey.rawApiKey.length).toBeGreaterThan(0);
		});

		test('should create a user via public API', async ({ api }) => {
			const user = await api.publicApi.createUser({
				email: `public-api-user-${nanoid()}@test.com`,
				firstName: 'Public',
				lastName: 'ApiUser',
			});

			expect(user.email).toContain('public-api-user');
			expect(user.firstName).toBe('Public');
			expect(user.lastName).toBe('ApiUser');
			expect(user.role).toBe('global:member');
		});

		test('should list users via public API', async ({ api }) => {
			// Create a user first
			await api.publicApi.createUser({
				email: `list-test-user-${nanoid()}@test.com`,
			});

			const users = await api.publicApi.getUsers({ includeRole: true });

			expect(users.length).toBeGreaterThan(0);
			// Should have at least the owner
			const owner = users.find((u) => u.role === 'global:owner');
			expect(owner).toBeDefined();
		});

		test('should create multiple users and maintain separate sessions', async ({ n8n, api }) => {
			// Create users via public API
			const user1 = await api.publicApi.createUser({
				email: `multi-user-1-${nanoid()}@test.com`,
				firstName: 'User',
				lastName: 'One',
			});
			const user2 = await api.publicApi.createUser({
				email: `multi-user-2-${nanoid()}@test.com`,
				firstName: 'User',
				lastName: 'Two',
			});

			// Owner should see their settings
			await n8n.navigate.toPersonalSettings();
			await expect(n8n.settingsPersonal.getUserRole()).toHaveText('Owner');

			// Create isolated browser contexts for each user
			const user1N8n = await n8n.start.withUser(user1);
			const user2N8n = await n8n.start.withUser(user2);

			// Verify each user sees their own context
			await user1N8n.navigate.toPersonalSettings();
			await expect(user1N8n.settingsPersonal.getUserRole()).toHaveText('Member');

			await user2N8n.navigate.toPersonalSettings();
			await expect(user2N8n.settingsPersonal.getUserRole()).toHaveText('Member');

			// Owner should still be owner after all this
			await n8n.page.reload();
			await expect(n8n.settingsPersonal.getUserRole()).toHaveText('Owner');
		});
	});
});
