import { nanoid } from 'nanoid';
import { test, expect } from '../../../fixtures/base';

test.describe('Credential Sharing', () => {
	test.beforeEach(async ({ api }) => {
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
	});

	test('should share credential with another user', async ({ api, n8n }) => {
		// Create users
		const owner = await api.publicApi.createUser({ role: 'global:member' });
		const sharee = await api.publicApi.createUser({ role: 'global:member' });

		// Owner creates credential
		const ownerPage = await n8n.start.withUser(owner);
		const credName = `Notion API ${nanoid(8)}`;
		const credential = await api.credentials.createCredential({
			name: credName,
			type: 'notionApi',
			data: { apiKey: 'test-key-123' },
		});

		// Share credential with sharee
		await api.credentials.shareCredential(credential.id, [sharee.id]);

		// Verify sharee can see the credential
		const shareePage = await n8n.start.withUser(sharee);
		await shareePage.navigate.toCredentials();
		await expect(shareePage.credentials.cards.getCredential(credName)).toBeVisible();
	});

	test('should allow sharee to use shared credential in workflow', async ({ api, n8n }) => {
		// Create users
		const owner = await api.publicApi.createUser({ role: 'global:member' });
		const sharee = await api.publicApi.createUser({ role: 'global:member' });

		// Owner creates and shares credential
		const credName = `Notion API ${nanoid(8)}`;
		const credential = await api.credentials.createCredential({
			name: credName,
			type: 'notionApi',
			data: { apiKey: 'test-key-123' },
		});
		await api.credentials.shareCredential(credential.id, [sharee.id]);

		// Sharee creates workflow using shared credential
		const shareePage = await n8n.start.withUser(sharee);
		await shareePage.navigate.toWorkflow('new');
		await shareePage.canvas.addNode('Notion', { action: 'Append a block' });

		// Verify shared credential is available
		await shareePage.ndv.getNodeCredentialsSelect().click();
		await expect(shareePage.ndv.getVisiblePopper().getByText(credName)).toBeVisible();
	});

	test('should auto-test shared credential when opened by sharee', async ({ api, n8n }) => {
		// Create users
		const owner = await api.publicApi.createUser({ role: 'global:member' });
		const sharee = await api.publicApi.createUser({ role: 'global:member' });

		// Owner creates and shares credential
		const credName = `Notion API ${nanoid(8)}`;
		const credential = await api.credentials.createCredential({
			name: credName,
			type: 'notionApi',
			data: { apiKey: 'test-key-123' },
		});
		await api.credentials.shareCredential(credential.id, [sharee.id]);

		// Sharee opens credential
		const shareePage = await n8n.start.withUser(sharee);
		await shareePage.navigate.toCredentials();
		await shareePage.credentials.cards.getCredential(credName).click();

		// Verify auto-test ran successfully
		await expect(shareePage.credentials.credentialModal.getTestSuccessTag()).toBeVisible();
		await shareePage.credentials.credentialModal.close();
	});

	test('should share credential with multiple users', async ({ api, n8n }) => {
		// Create users
		const owner = await api.publicApi.createUser({ role: 'global:member' });
		const sharee1 = await api.publicApi.createUser({ role: 'global:member' });
		const sharee2 = await api.publicApi.createUser({ role: 'global:member' });

		// Owner creates credential
		const credName = `Notion API ${nanoid(8)}`;
		const credential = await api.credentials.createCredential({
			name: credName,
			type: 'notionApi',
			data: { apiKey: 'test-key-123' },
		});

		// Share with both users
		await api.credentials.shareCredential(credential.id, [sharee1.id, sharee2.id]);

		// Verify both sharees can see the credential
		const sharee1Page = await n8n.start.withUser(sharee1);
		await sharee1Page.navigate.toCredentials();
		await expect(sharee1Page.credentials.cards.getCredential(credName)).toBeVisible();

		const sharee2Page = await n8n.start.withUser(sharee2);
		await sharee2Page.navigate.toCredentials();
		await expect(sharee2Page.credentials.cards.getCredential(credName)).toBeVisible();
	});

	test('should share credential between personal and team projects', async ({ api, n8n }) => {
		await api.setMaxTeamProjectsQuota(-1);

		// Create owner and team project
		const owner = await api.publicApi.createUser({ role: 'global:member' });
		const ownerPage = await n8n.start.withUser(owner);

		// Create personal credential
		const personalCredName = `Notion API Personal ${nanoid(8)}`;
		const personalCredential = await api.credentials.createCredential({
			name: personalCredName,
			type: 'notionApi',
			data: { apiKey: 'test-key-personal' },
		});

		// Create team project
		const teamProjectName = `Team ${nanoid(8)}`;
		const teamProject = await ownerPage.projectComposer.createProject(teamProjectName);

		// Share personal credential with team project
		await api.credentials.shareCredential(personalCredential.id, [teamProject.projectId]);

		// Verify credential is shared
		await ownerPage.navigate.toCredentials();
		await ownerPage.credentials.cards.getCredential(personalCredName).click();
		await ownerPage.credentials.credentialModal.changeTab('Sharing');

		// Verify team project is listed in sharing
		await expect(
			ownerPage.credentials.credentialModal.getModal().getByText(teamProjectName),
		).toBeVisible();

		await ownerPage.credentials.credentialModal.close();
	});
});
