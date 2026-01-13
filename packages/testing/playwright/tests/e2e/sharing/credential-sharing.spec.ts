import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const TEST_API_KEY = 'test-api-key';

test.describe('Credential Sharing', () => {
	test('should share credential with another user via UI', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test users
		const owner = await api.users.getOwner();
		const member = await api.users.create({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		// Owner creates a credential
		await n8n.navigate.toCredentials();
		await n8n.credentials.addResource.credential();
		await n8n.credentials.selectCredentialType('Notion API');
		await n8n.credentials.credentialModal.fillField('apiKey', TEST_API_KEY);
		const credentialName = `Test Credential ${nanoid()}`;
		await n8n.credentials.credentialModal.renameCredential(credentialName);
		await n8n.credentials.credentialModal.save();

		// Share credential via UI
		await n8n.credentials.credentialModal.changeTab('Sharing');
		await n8n.credentials.credentialModal.addUserToSharing(member.email);
		await n8n.credentials.credentialModal.saveSharing();
		await n8n.credentials.credentialModal.close();

		// Verify member can see the shared credential
		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toCredentials();

		await expect(memberN8n.credentials.cards.getCredential(credentialName)).toBeVisible();
	});

	test('should share credential with another user via API', async ({ api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test users
		const owner = await api.users.getOwner();
		const member = await api.users.create({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		// Get member's personal project ID for sharing
		const ownerProject = await api.projects.getPersonalProject(owner.id);
		const memberProject = await api.projects.getPersonalProject(member.id);

		// Create a credential as owner
		const credential = await api.credentials.createCredential({
			name: `Test Credential ${nanoid()}`,
			type: 'notionApi',
			data: { apiKey: TEST_API_KEY },
		});

		// Share credential with member's personal project
		await api.credentials.shareCredential(credential.id, [memberProject.id]);

		// Verify member can access the credential
		const memberCredentials = await api.users.withUser(member, async (memberApi) => {
			return await memberApi.credentials.getCredentials();
		});

		const sharedCredential = memberCredentials.find((c) => c.id === credential.id);
		expect(sharedCredential).toBeTruthy();
		expect(sharedCredential?.name).toBe(credential.name);
	});

	test('should unshare credential by removing user', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test users
		const owner = await api.users.getOwner();
		const member = await api.users.create({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		// Get personal projects
		const memberProject = await api.projects.getPersonalProject(member.id);

		// Create and share credential
		const credential = await api.credentials.createCredential({
			name: `Test Credential ${nanoid()}`,
			type: 'notionApi',
			data: { apiKey: TEST_API_KEY },
		});

		await api.credentials.shareCredential(credential.id, [memberProject.id]);

		// Verify member can see the credential initially
		let memberCredentials = await api.users.withUser(member, async (memberApi) => {
			return await memberApi.credentials.getCredentials();
		});
		expect(memberCredentials.some((c) => c.id === credential.id)).toBe(true);

		// Unshare by setting empty shareWithIds
		await api.credentials.shareCredential(credential.id, []);

		// Verify member can no longer see the credential
		memberCredentials = await api.users.withUser(member, async (memberApi) => {
			return await memberApi.credentials.getCredentials();
		});
		expect(memberCredentials.some((c) => c.id === credential.id)).toBe(false);
	});

	test('should show shared credential with proper permissions in node credential dropdown', async ({
		n8n,
		api,
	}) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test users
		const owner = await api.users.getOwner();
		const member = await api.users.create({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		// Get personal projects
		const memberProject = await api.projects.getPersonalProject(member.id);

		// Create and share credential
		const credential = await api.credentials.createCredential({
			name: `Test Credential ${nanoid()}`,
			type: 'notionApi',
			data: { apiKey: TEST_API_KEY },
		});

		await api.credentials.shareCredential(credential.id, [memberProject.id]);

		// Member creates a workflow and uses the shared credential
		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toWorkflow('new');
		await memberN8n.canvas.addNode('Notion', { action: 'Append a block' });

		// Verify shared credential is available and auto-selected
		await expect(memberN8n.ndv.getCredentialSelect()).toHaveValue(credential.name);
		await memberN8n.ndv.clickBackToCanvasButton();
	});
});