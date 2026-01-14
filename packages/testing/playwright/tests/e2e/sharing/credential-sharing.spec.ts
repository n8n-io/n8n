import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const TEST_API_KEY = 'test-api-key';

test.describe('Credential Sharing', () => {
	test('should share credential with another user via UI', async ({ n8n, api }) => {
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		await n8n.navigate.toCredentials();
		await n8n.credentials.addResource.credential();
		await n8n.credentials.selectCredentialType('Notion API');
		await n8n.credentials.credentialModal.fillField('apiKey', TEST_API_KEY);
		const credentialName = `Test Credential ${nanoid()}`;
		await n8n.credentials.credentialModal.renameCredential(credentialName);
		await n8n.credentials.credentialModal.save();

		await n8n.credentials.credentialModal.changeTab('Sharing');
		await n8n.credentials.credentialModal.addUserToSharing(member.email);
		await n8n.credentials.credentialModal.saveSharing();
		await n8n.credentials.credentialModal.close();

		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toCredentials();
		await expect(memberN8n.credentials.cards.getCredential(credentialName)).toBeVisible();
	});

	test('should share credential with another user via API', async ({ api }) => {
		await api.enableProjectFeatures();

		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		const credential = await api.credentials.createCredential({
			name: `Test Credential ${nanoid()}`,
			type: 'notionApi',
			data: { apiKey: TEST_API_KEY },
		});

		const memberApi = await api.createApiForUser(member);
		const memberProject = await memberApi.projects.getMyPersonalProject();
		await api.credentials.shareCredential(credential.id, [memberProject.id]);

		const memberCredentials = await memberApi.credentials.getCredentials();
		const sharedCredential = memberCredentials.find((c) => c.id === credential.id);
		expect(sharedCredential).toBeTruthy();
		expect(sharedCredential?.name).toBe(credential.name);
	});

	test('should show shared credential with proper permissions in node credential dropdown', async ({
		n8n,
		api,
	}) => {
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		const credential = await api.credentials.createCredential({
			name: `Test Credential ${nanoid()}`,
			type: 'notionApi',
			data: { apiKey: TEST_API_KEY },
		});

		const memberApi = await api.createApiForUser(member);
		const memberProject = await memberApi.projects.getMyPersonalProject();
		await api.credentials.shareCredential(credential.id, [memberProject.id]);

		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toWorkflow('new');
		await memberN8n.canvas.addNode('Notion');
		await memberN8n.canvas.getFirstAction().click();

		await expect(memberN8n.ndv.getCredentialSelect()).toHaveValue(credential.name);
	});
});
