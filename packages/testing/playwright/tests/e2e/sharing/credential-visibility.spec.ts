import { nanoid } from 'nanoid';

import { INSTANCE_OWNER_CREDENTIALS } from '../../../config/test-users';
import { test, expect } from '../../../fixtures/base';

const TEST_API_KEY = 'test-api-key';

test.describe('Credential Visibility Rules', () => {
	test('should only show credentials from the same team project', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
		await api.setMaxTeamProjectsQuota(-1);

		// Create credentials in personal project
		await n8n.navigate.toCredentials();
		const personalCredName = `Personal Credential ${nanoid()}`;
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{
				name: personalCredName,
			},
		);

		// Create team project and add credential
		const devProject = await n8n.projectComposer.createProject(`Development ${nanoid()}`);
		await n8n.projectTabs.clickCredentialsTab();
		const devCredName = `Dev Credential ${nanoid()}`;
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{ projectId: devProject.projectId, name: devCredName },
		);

		// Create another team project and add credential
		const testProject = await n8n.projectComposer.createProject(`Test ${nanoid()}`);
		await n8n.navigate.toProject(testProject.projectId);
		await n8n.projectTabs.clickCredentialsTab();
		const testCredName = `Test Credential ${nanoid()}`;
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{ projectId: testProject.projectId, name: testCredName },
		);

		// Create workflow in test project
		await n8n.navigate.toProject(testProject.projectId);
		await n8n.projectTabs.clickWorkflowsTab();
		await n8n.workflows.clickNewWorkflowCard();

			await n8n.projectTabs.clickWorkflowsTab();
			await n8n.workflows.clickNewWorkflowButtonFromProject();

		// Only test project credential should be visible
		await n8n.ndv.getNodeCredentialsSelect().click();
		const credentialDropdown = n8n.ndv.getVisiblePopper();
		await expect(credentialDropdown.getByText(testCredName)).toBeVisible();
		// Personal and dev project credentials should not be visible
		await expect(credentialDropdown.getByText(personalCredName)).toBeHidden();
		await expect(credentialDropdown.getByText(devCredName)).toBeHidden();
	});

	test('should show personal and shared credentials for members', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test user
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		// Owner creates and shares a credential
		const ownerCredName = `Owner Credential ${nanoid()}`;
		await n8n.navigate.toCredentials();
		await n8n.credentials.addResource.credential();
		await n8n.credentials.selectCredentialType('Notion API');
		await n8n.credentials.credentialModal.fillField('apiKey', TEST_API_KEY);
		await n8n.credentials.credentialModal.renameCredential(ownerCredName);
		await n8n.credentials.credentialModal.save();

		await n8n.credentials.credentialModal.changeTab('Sharing');
		await n8n.credentials.credentialModal.addUserToSharing(member.email);
		await n8n.credentials.credentialModal.saveSharing();
		await n8n.credentials.credentialModal.close();

		// Member creates their own credential
		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toCredentials();
		const memberCredName = `Member Credential ${nanoid()}`;
		await memberN8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{
				name: memberCredName,
			},
		);

		// Create workflow and check credential visibility
		await memberN8n.navigate.toWorkflow('new');
		await memberN8n.canvas.addNode('Notion');
		await memberN8n.canvas.getFirstAction().click();

		// Both own credential and shared credential should be visible
		await memberN8n.ndv.getNodeCredentialsSelect().click();
		const credentialDropdown = memberN8n.ndv.getVisiblePopper();
		await expect(credentialDropdown.getByText(ownerCredName)).toBeVisible();
		await expect(credentialDropdown.getByText(memberCredName)).toBeVisible();
	});

	test('should only show own credentials in shared workflow for members', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test user
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		// Owner creates a credential (not shared)
		const ownerCredName = `Owner Credential ${nanoid()}`;
		await n8n.navigate.toCredentials();
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{
				name: ownerCredName,
			},
		);

		// Owner creates and shares a workflow
		await n8n.navigate.toWorkflow('new');
		const workflowName = `Test Workflow ${nanoid()}`;
		await n8n.canvas.setWorkflowName(workflowName);
		await n8n.page.keyboard.press('Enter');
		await n8n.canvas.openShareModal();
		await n8n.workflowSharingModal.addUser(member.email);
		await n8n.workflowSharingModal.save();

		// Member creates their own credential
		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toCredentials();
		const memberCredName = `Member Credential ${nanoid()}`;
		await memberN8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{
				name: memberCredName,
			},
		);

		// Member opens shared workflow
		await memberN8n.navigate.toWorkflows();
		await memberN8n.workflows.cards.getWorkflow(workflowName).click();

		await memberN8n.canvas.addNode('Notion');
		await memberN8n.canvas.getFirstAction().click();

		// Only member's own credential should be visible (not owner's)
		await memberN8n.ndv.getNodeCredentialsSelect().click();
		const credentialDropdown = memberN8n.ndv.getVisiblePopper();
		await expect(credentialDropdown.getByText(memberCredName)).toBeVisible();
		await expect(credentialDropdown.getByText(ownerCredName)).toBeHidden();
	});

	test('should show all personal credentials for global owner in shared workflows', async ({
		n8n,
		api,
	}) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Use the known owner email - getOwner() can fail in parallel execution
		const ownerEmail = INSTANCE_OWNER_CREDENTIALS.email;
		const member1 = await api.publicApi.createUser({
			email: `member1-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member1',
		});
		const member2 = await api.publicApi.createUser({
			email: `member2-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member2',
		});
		const admin = await api.publicApi.createUser({
			email: `admin-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Admin',
			role: 'global:admin',
		});

		// Each user creates their own credential
		const member1N8n = await n8n.start.withUser(member1);
		await member1N8n.navigate.toCredentials();
		const member1CredName = `Member1 Credential ${nanoid()}`;
		await member1N8n.credentials.addResource.credential();
		await member1N8n.credentials.selectCredentialType('Notion API');
		await member1N8n.credentials.credentialModal.fillField('apiKey', TEST_API_KEY);
		await member1N8n.credentials.credentialModal.renameCredential(member1CredName);
		await member1N8n.credentials.credentialModal.save();
		await member1N8n.credentials.credentialModal.close();

		const adminN8n = await n8n.start.withUser(admin);
		await adminN8n.navigate.toCredentials();
		const adminCredName = `Admin Credential ${nanoid()}`;
		await adminN8n.credentials.addResource.credential();
		await adminN8n.credentials.selectCredentialType('Notion API');
		await adminN8n.credentials.credentialModal.fillField('apiKey', TEST_API_KEY);
		await adminN8n.credentials.credentialModal.renameCredential(adminCredName);
		await adminN8n.credentials.credentialModal.save();
		await adminN8n.credentials.credentialModal.close();

		// Member2 creates workflow and shares with owner and admin
		const member2N8n = await n8n.start.withUser(member2);
		await member2N8n.navigate.toCredentials();
		const member2CredName = `Member2 Credential ${nanoid()}`;
		await member2N8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{
				name: member2CredName,
			},
		);

		await member2N8n.navigate.toWorkflow('new');
		const workflowName = `Test Workflow ${nanoid()}`;
		await member2N8n.canvas.setWorkflowName(workflowName);
		await member2N8n.page.keyboard.press('Enter');
		await member2N8n.canvas.openShareModal();
		await member2N8n.workflowSharingModal.addUser(ownerEmail);
		await member2N8n.workflowSharingModal.addUser(admin.email);
		await member2N8n.workflowSharingModal.save();

		// Owner creates their own credential
		await n8n.navigate.toCredentials();
		const ownerCredName = `Owner Credential ${nanoid()}`;
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{
				name: ownerCredName,
			},
		);

		// Owner opens shared workflow
		await n8n.navigate.toWorkflows();
		await n8n.workflows.cards.getWorkflow(workflowName).click();

		await n8n.canvas.addNode('Notion');
		await n8n.canvas.getFirstAction().click();

		// Owner should see all 3 credentials: admin's, member2's, and owner's
		await n8n.ndv.getNodeCredentialsSelect().click();
		const credentialOptions = n8n.ndv.getVisiblePopper().locator('li');
		// Don't check exact count as other tests may create credentials in parallel

		// Check all expected credentials are present
		await expect(credentialOptions.filter({ hasText: ownerCredName })).toBeVisible();
		await expect(credentialOptions.filter({ hasText: member2CredName })).toBeVisible();
		await expect(credentialOptions.filter({ hasText: adminCredName })).toBeVisible();
	});

	test('should show all personal credentials for global owner in own workflows', async ({
		n8n,
		api,
	}) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create a member user
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		// Member creates a credential
		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toCredentials();
		const memberCredName = `Member Credential ${nanoid()}`;
		await memberN8n.credentials.addResource.credential();
		await memberN8n.credentials.selectCredentialType('Notion API');
		await memberN8n.credentials.credentialModal.fillField('apiKey', TEST_API_KEY);
		await memberN8n.credentials.credentialModal.renameCredential(memberCredName);
		await memberN8n.credentials.credentialModal.save();
		await memberN8n.credentials.credentialModal.close();

		// Owner creates new workflow
		await n8n.navigate.toWorkflow('new');
		await n8n.canvas.addNode('Notion');
		await n8n.canvas.getFirstAction().click();

		// Owner should see member's credential (global owner privilege)
		await n8n.ndv.getNodeCredentialsSelect().click();
		const credentialOptions = n8n.ndv.getVisiblePopper().locator('li');
		// Check that the member's credential is visible (don't check exact count as other tests may create credentials)
		await expect(credentialOptions.filter({ hasText: memberCredName })).toBeVisible();
	});
});
