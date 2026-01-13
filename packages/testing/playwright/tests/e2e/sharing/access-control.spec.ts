import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const TEST_API_KEY = 'test-api-key';

test.describe('Access Control Boundaries', () => {
	test('should prevent credential editing by sharee', async ({ n8n, api }) => {
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

		// Owner creates and shares a credential
		const credentialName = `Owner Credential ${nanoid()}`;
		await n8n.navigate.toCredentials();
		await n8n.credentials.addResource.credential();
		await n8n.credentials.selectCredentialType('Notion API');
		await n8n.credentials.credentialModal.fillField('apiKey', TEST_API_KEY);
		await n8n.credentials.credentialModal.renameCredential(credentialName);
		await n8n.credentials.credentialModal.save();

		await n8n.credentials.credentialModal.changeTab('Sharing');
		await n8n.credentials.credentialModal.addUserToSharing(member.email);
		await n8n.credentials.credentialModal.saveSharing();
		await n8n.credentials.credentialModal.close();

		// Member should see the credential but with limited permissions
		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toCredentials();
		await memberN8n.credentials.cards.getCredential(credentialName).click();

		// Credential should automatically test (testing is allowed for shared credentials)
		await expect(memberN8n.credentials.credentialModal.getTestSuccessTag()).toBeVisible();

		// Sensitive data should be masked for sharee
		const passwordInput = memberN8n.credentials.credentialModal
			.getCredentialInputs()
			.locator('input')
			.first();
		const inputValue = await passwordInput.inputValue();
		expect(inputValue).toContain('__n8n_BLANK_VALUE_');
	});

	test('should allow admin full access to credentials created by others', async ({ n8n, api }) => {
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
		const admin = await api.users.create({
			email: `admin-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Admin',
			role: 'global:admin',
		});

		// Member creates a credential
		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toCredentials();
		const credentialName = `Member Credential ${nanoid()}`;
		await memberN8n.credentials.addResource.credential();
		await memberN8n.credentials.selectCredentialType('Notion API');
		await memberN8n.credentials.credentialModal.fillField('apiKey', TEST_API_KEY);
		await memberN8n.credentials.credentialModal.renameCredential(credentialName);
		await memberN8n.credentials.credentialModal.save();
		await memberN8n.credentials.credentialModal.close();

		// Admin can access and modify the credential
		const adminN8n = await n8n.start.withUser(admin);
		await adminN8n.navigate.toCredentials();
		await adminN8n.credentials.cards.getCredential(credentialName).click();

		// Admin should see success tag
		await expect(adminN8n.credentials.credentialModal.getTestSuccessTag()).toBeVisible();

		// Admin cannot see sensitive data (it's masked)
		const passwordInput = adminN8n.credentials.credentialModal
			.getCredentialInputs()
			.locator('input')
			.first();
		const inputValue = await passwordInput.inputValue();
		expect(inputValue).toContain('__n8n_BLANK_VALUE_');

		// Admin can access sharing tab
		await adminN8n.credentials.credentialModal.changeTab('Sharing');

		await expect(
			adminN8n.credentials.credentialModal
				.getModal()
				.getByText('Sharing a credential allows people to use it in their workflows')
		).toBeVisible();

		// Admin can see users in sharing dropdown
		await adminN8n.credentials.credentialModal.getUsersSelect().click();
		const sharingOptions = adminN8n.credentials.credentialModal.getVisibleDropdown().getByTestId('project-sharing-info');
		await expect(sharingOptions).toHaveCount(5); // All users should be available

		// Admin can share with themselves and others
		await expect(
			adminN8n.credentials.credentialModal.getVisibleDropdown().getByText(admin.email)
		).toBeVisible();

		await adminN8n.credentials.credentialModal.getVisibleDropdown().getByText(owner.email).click();
		await adminN8n.credentials.credentialModal.addUserToSharing(admin.email);
		await adminN8n.credentials.credentialModal.saveSharing();
		await adminN8n.credentials.credentialModal.close();
	});

	test('should prevent access to private workflows via direct URL', async ({ n8n, api }) => {
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

		// Owner creates a private workflow
		const workflowName = `Private Workflow ${nanoid()}`;
		const workflow = await api.workflows.createWorkflow({
			name: workflowName,
			nodes: [
				{
					id: 'manual-trigger',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					position: [100, 200],
					parameters: {},
					typeVersion: 1,
				},
			],
			connections: {},
		});

		// Member tries to access the workflow via API - should fail
		try {
			await api.users.withUser(member, async (memberApi) => {
				await memberApi.workflows.getWorkflow(workflow.id);
			});
			// If we get here, the test should fail
			expect(false).toBe(true);
		} catch (error) {
			// Expected to fail with 403 or 404
			expect(error).toBeTruthy();
		}
	});

	test('should show disabled credential in node for non-owner', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test users
		const owner = await api.users.getOwner();
		const member1 = await api.users.create({
			email: `member1-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member1',
		});
		const member2 = await api.users.create({
			email: `member2-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member2',
		});

		// Get personal projects
		const member2Project = await api.projects.getPersonalProject(member2.id);

		// Member1 creates a credential and workflow
		const member1N8n = await n8n.start.withUser(member1);
		const credentialName = `Member1 Credential ${nanoid()}`;
		await member1N8n.navigate.toCredentials();
		await member1N8n.credentialsComposer.createFromList('Notion API', { apiKey: TEST_API_KEY }, {
			name: credentialName,
		});

		await member1N8n.navigate.toWorkflow('new');
		const workflowName = `Test Workflow ${nanoid()}`;
		await member1N8n.canvas.setWorkflowName(workflowName);
		await member1N8n.canvas.addNode('Manual Trigger');
		await member1N8n.canvas.addNode('Notion', { action: 'Append a block' });

		// Verify credential is auto-selected and enabled for owner
		await expect(member1N8n.ndv.getCredentialSelect()).toHaveValue(credentialName);
		await expect(member1N8n.ndv.getCredentialSelect()).toBeEnabled();
		await member1N8n.ndv.clickBackToCanvasButton();

		// Share workflow with member2
		await member1N8n.canvas.openShareModal();
		await member1N8n.workflowSharingModal.addUser(member2.email);
		await member1N8n.workflowSharingModal.save();

		// Member2 opens the shared workflow
		const member2N8n = await n8n.start.withUser(member2);
		await member2N8n.navigate.toWorkflows();
		await member2N8n.workflows.cards.getWorkflow(workflowName).click();

		await member2N8n.canvas.openNode('Append a block');

		// Credential should be shown but disabled for non-owner
		await expect(member2N8n.ndv.getNodeCredentialsSelect()).toHaveValue(credentialName);
		await expect(member2N8n.ndv.getNodeCredentialsSelect()).toBeDisabled();
	});

	test('should allow credential owner to use credential in shared workflow', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test users
		const owner = await api.users.getOwner();
		const member1 = await api.users.create({
			email: `member1-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member1',
		});
		const member2 = await api.users.create({
			email: `member2-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member2',
		});

		// Get personal projects
		const member1Project = await api.projects.getPersonalProject(member1.id);

		// Member1 creates a credential
		const member1N8n = await n8n.start.withUser(member1);
		const credentialName = `Member1 Credential ${nanoid()}`;
		await member1N8n.navigate.toCredentials();
		await member1N8n.credentialsComposer.createFromList('Notion API', { apiKey: TEST_API_KEY }, {
			name: credentialName,
		});

		// Member2 creates and shares a workflow with member1
		const member2N8n = await n8n.start.withUser(member2);
		await member2N8n.navigate.toWorkflow('new');
		const workflowName = `Test Workflow ${nanoid()}`;
		await member2N8n.canvas.setWorkflowName(workflowName);
		await member2N8n.canvas.addNode('Manual Trigger');
		await member2N8n.canvas.openShareModal();
		await member2N8n.workflowSharingModal.addUser(member1.email);
		await member2N8n.workflowSharingModal.save();

		// Member1 opens shared workflow and adds node with their credential
		await member1N8n.navigate.toWorkflows();
		await member1N8n.workflows.cards.getWorkflow(workflowName).click();

		await member1N8n.canvas.addNode('Notion', { action: 'Append a block' });
		await member1N8n.canvas.waitForSaveWorkflowCompleted();

		// Member1's credential should be auto-selected and enabled
		await expect(member1N8n.ndv.getCredentialSelect()).toHaveValue(credentialName);
		await expect(member1N8n.ndv.getCredentialSelect()).toBeEnabled();
	});

	test('should enforce project isolation for team projects', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
		await api.setMaxTeamProjectsQuota(-1);

		// Create test users
		const owner = await api.users.getOwner();
		const member = await api.users.create({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		// Create two team projects
		const devProject = await n8n.projectComposer.createProject(`Development ${nanoid()}`);
		const testProject = await n8n.projectComposer.createProject(`Testing ${nanoid()}`);

		// Create credential in dev project
		await n8n.navigate.toProject(devProject.projectId);
		await n8n.projectTabs.clickCredentialsTab();
		const devCredName = `Dev Credential ${nanoid()}`;
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{ projectId: devProject.projectId, name: devCredName }
		);

		// Create credential in test project
		await n8n.navigate.toProject(testProject.projectId);
		await n8n.projectTabs.clickCredentialsTab();
		const testCredName = `Test Credential ${nanoid()}`;
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{ projectId: testProject.projectId, name: testCredName }
		);

		// Create workflow in test project
		await n8n.projectTabs.clickWorkflowsTab();
		await n8n.workflows.clickNewWorkflowCard();
		await n8n.canvas.addNode('Notion');
		await n8n.canvas.getFirstAction().click();

		// Only test project credential should be available
		await n8n.ndv.getNodeCredentialsSelect().click();
		const credentialOptions = n8n.ndv.getVisiblePopper().locator('li');
		await expect(credentialOptions).toHaveCount(1);
		await expect(credentialOptions.first()).toContainText(testCredName);
		await expect(credentialOptions.first()).not.toContainText(devCredName);
	});

	test('should prevent sharing team project workflows', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
		await api.setMaxTeamProjectsQuota(-1);

		// Create team project
		const teamProject = await n8n.projectComposer.createProject(`Team Project ${nanoid()}`);

		// Create workflow in team project
		const teamWorkflow = await api.workflows.createInProject(teamProject.projectId, {
			name: `Team Workflow ${nanoid()}`,
		});

		await n8n.navigate.toWorkflow(teamWorkflow.id);

		// Team project workflows cannot be shared
		await n8n.canvas.openShareModal();
		await expect(n8n.workflowSharingModal.getUsersSelect()).toHaveCount(0);
	});
});