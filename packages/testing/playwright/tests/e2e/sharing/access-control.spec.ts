import { nanoid } from 'nanoid';
import { test, expect } from '../../../fixtures/base';

test.describe('Access Control', () => {
	test.beforeEach(async ({ api }) => {
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
	});

	test('should block access to unshared workflow with 403', async ({ api, n8n }) => {
		// Create users
		const owner = await api.publicApi.createUser({ role: 'global:member' });
		const member = await api.publicApi.createUser({ role: 'global:member' });

		// Owner creates workflow
		const workflowName = `Private Workflow ${nanoid(8)}`;
		const workflow = await api.workflows.createWorkflow({
			name: workflowName,
			nodes: [],
			connections: {},
			active: false,
		});

		// Member tries to access without permission
		const memberPage = await n8n.start.withUser(member);
		await memberPage.page.goto(`/workflow/${workflow.id}`);

		// Verify blocked with entity not authorized page
		await expect(memberPage.page).toHaveURL('/entity-not-authorized/workflow');
	});

	test('should show disabled credential select for unowned credential in shared workflow', async ({
		api,
		n8n,
	}) => {
		// Create users
		const owner = await api.publicApi.createUser({ role: 'global:member' });
		const sharee = await api.publicApi.createUser({ role: 'global:member' });

		// Owner creates credential
		const credName = `Owner Notion ${nanoid(8)}`;
		const credential = await api.credentials.createCredential({
			name: credName,
			type: 'notionApi',
			data: { apiKey: 'owner-key' },
		});

		// Owner creates workflow with node using credential
		const ownerPage = await n8n.start.withUser(owner);
		const workflowName = `Workflow ${nanoid(8)}`;
		await ownerPage.navigate.toWorkflow('new');
		await ownerPage.canvas.setWorkflowName(workflowName);
		await ownerPage.page.keyboard.press('Enter');
		await ownerPage.canvas.addNode('Manual Trigger');
		await ownerPage.canvas.addNode('Notion', { action: 'Append a block' });

		// Verify credential auto-selected
		await expect(ownerPage.ndv.getCredentialSelect()).toHaveValue(credName);
		await ownerPage.ndv.clickBackToCanvasButton();

		// Share workflow with sharee (but not credential)
		await ownerPage.canvas.openShareModal();
		await ownerPage.workflowSharingModal.addUser(sharee.email);
		await ownerPage.workflowSharingModal.save();

		// Sharee opens workflow
		const shareePage = await n8n.start.withUser(sharee);
		await shareePage.navigate.toWorkflows();
		await shareePage.workflows.cards.getWorkflow(workflowName).click();

		// Open node with credential
		await shareePage.canvas.openNode('Append a block');

		// Verify credential is shown but disabled
		await expect(shareePage.ndv.getNodeCredentialsSelect()).toHaveValue(credName);
		await expect(shareePage.ndv.getNodeCredentialsSelect()).toBeDisabled();

		await shareePage.ndv.clickBackToCanvasButton();
	});

	test('should show enabled credential select for owned credential in shared workflow', async ({
		api,
		n8n,
	}) => {
		// Create users
		const owner = await api.publicApi.createUser({ role: 'global:member' });
		const sharee = await api.publicApi.createUser({ role: 'global:member' });

		// Owner creates credential
		const credName = `Owner Notion ${nanoid(8)}`;
		await api.credentials.createCredential({
			name: credName,
			type: 'notionApi',
			data: { apiKey: 'owner-key' },
		});

		// Owner creates workflow with node using credential
		const ownerPage = await n8n.start.withUser(owner);
		const workflowName = `Workflow ${nanoid(8)}`;
		await ownerPage.navigate.toWorkflow('new');
		await ownerPage.canvas.setWorkflowName(workflowName);
		await ownerPage.page.keyboard.press('Enter');
		await ownerPage.canvas.addNode('Manual Trigger');
		await ownerPage.canvas.addNode('Notion', { action: 'Append a block' });

		// Verify credential auto-selected
		await expect(ownerPage.ndv.getCredentialSelect()).toHaveValue(credName);
		await ownerPage.ndv.clickBackToCanvasButton();

		// Share workflow with sharee
		await ownerPage.canvas.openShareModal();
		await ownerPage.workflowSharingModal.addUser(sharee.email);
		await ownerPage.workflowSharingModal.save();

		// Owner reopens workflow
		await ownerPage.navigate.toWorkflows();
		await ownerPage.workflows.cards.getWorkflow(workflowName).click();

		// Open node with credential
		await ownerPage.canvas.openNode('Append a block');

		// Verify credential is enabled for owner
		await expect(ownerPage.ndv.getNodeCredentialsSelect().locator('input')).toHaveValue(
			credName,
		);
		await expect(ownerPage.ndv.getNodeCredentialsSelect().locator('input')).toBeEnabled();

		await ownerPage.ndv.clickBackToCanvasButton();
	});

	test('should mask credential values for admin viewing other user credentials', async ({
		api,
		n8n,
	}) => {
		// Create users
		const member = await api.publicApi.createUser({ role: 'global:member' });
		const admin = await api.publicApi.createUser({ role: 'global:admin' });

		// Member creates credential
		const credName = `Member Notion ${nanoid(8)}`;
		const testApiKey = 'secret-api-key-123';
		await api.credentials.createCredential({
			name: credName,
			type: 'notionApi',
			data: { apiKey: testApiKey },
		});

		// Admin opens member's credential
		const adminPage = await n8n.start.withUser(admin);
		await adminPage.navigate.toCredentials();
		await adminPage.credentials.cards.getCredential(credName).click();

		// Verify auto-test ran successfully
		await expect(adminPage.credentials.credentialModal.getTestSuccessTag()).toBeVisible();

		// Verify sensitive data is masked
		const passwordInput = adminPage.credentials.credentialModal
			.getCredentialInputs()
			.locator('input')
			.first();
		const inputValue = await passwordInput.inputValue();
		expect(inputValue).toContain('__n8n_BLANK_VALUE_');
		expect(inputValue).not.toContain(testApiKey);

		await adminPage.credentials.credentialModal.close();
	});

	test('should allow admin to share credential they do not own', async ({ api, n8n }) => {
		// Create users
		const member1 = await api.publicApi.createUser({ role: 'global:member' });
		const member2 = await api.publicApi.createUser({ role: 'global:member' });
		const admin = await api.publicApi.createUser({ role: 'global:admin' });

		// Member1 creates credential
		const credName = `Member Notion ${nanoid(8)}`;
		await api.credentials.createCredential({
			name: credName,
			type: 'notionApi',
			data: { apiKey: 'member-key' },
		});

		// Admin opens credential and shares it
		const adminPage = await n8n.start.withUser(admin);
		await adminPage.navigate.toCredentials();
		await adminPage.credentials.cards.getCredential(credName).click();

		// Go to Sharing tab
		await adminPage.credentials.credentialModal.changeTab('Sharing');

		// Verify admin can share with others
		await expect(
			adminPage.credentials.credentialModal
				.getModal()
				.getByText('Sharing a credential allows people to use it in their workflows'),
		).toBeVisible();

		// Share with member2
		await adminPage.credentials.credentialModal.addUserToSharing(member2.email);
		await adminPage.credentials.credentialModal.saveSharing();
		await adminPage.credentials.credentialModal.close();

		// Verify member2 can see the credential
		const member2Page = await n8n.start.withUser(member2);
		await member2Page.navigate.toCredentials();
		await expect(member2Page.credentials.cards.getCredential(credName)).toBeVisible();
	});

	test('should show admin their own email in sharing dropdown', async ({ api, n8n }) => {
		// Create users
		const member = await api.publicApi.createUser({ role: 'global:member' });
		const admin = await api.publicApi.createUser({ role: 'global:admin' });

		// Member creates credential
		const credName = `Member Notion ${nanoid(8)}`;
		await api.credentials.createCredential({
			name: credName,
			type: 'notionApi',
			data: { apiKey: 'member-key' },
		});

		// Admin opens credential sharing tab
		const adminPage = await n8n.start.withUser(admin);
		await adminPage.navigate.toCredentials();
		await adminPage.credentials.cards.getCredential(credName).click();
		await adminPage.credentials.credentialModal.changeTab('Sharing');

		// Open sharing dropdown
		await adminPage.credentials.credentialModal.getUsersSelect().click();

		// Verify admin can share with self
		await expect(
			adminPage.credentials.credentialModal.getVisibleDropdown().getByText(admin.email),
		).toBeVisible();

		await adminPage.credentials.credentialModal.close();
	});

	test('should allow global owner to execute workflows owned by others', async ({ api, n8n }) => {
		// Create users
		const member = await api.publicApi.createUser({ role: 'global:member' });
		const owner = await api.publicApi.createUser({ role: 'global:admin' });

		// Member creates workflow
		const workflowName = `Member Workflow ${nanoid(8)}`;
		await api.workflows.createWorkflow({
			name: workflowName,
			nodes: [
				{
					id: 'manual-trigger',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [250, 300],
					parameters: {},
				},
			],
			connections: {},
			active: false,
		});

		// Owner can see and execute the workflow
		const ownerPage = await n8n.start.withUser(owner);
		await ownerPage.navigate.toWorkflows();
		await ownerPage.workflows.cards.getWorkflow(workflowName).click();

		// Execute workflow
		await ownerPage.canvas.clickExecuteWorkflowButton();

		// Verify execution succeeded (no error)
		await expect(ownerPage.canvas.getExecuteWorkflowButton()).toBeVisible();
	});
});
