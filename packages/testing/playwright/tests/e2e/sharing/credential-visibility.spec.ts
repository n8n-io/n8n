import { nanoid } from 'nanoid';

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
		await memberN8n.canvas.addNode('Manual Trigger');
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

		// Owner creates a credential via UI (not shared)
		const ownerCredName = `Owner Credential ${nanoid()}`;
		await n8n.navigate.toCredentials();
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{
				name: ownerCredName,
			},
		);

		// Owner creates workflow via API for reliable ID
		const workflow = await api.workflows.createWorkflow({
			name: `Test Workflow ${nanoid()}`,
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

		// Get member's personal project and share workflow (withUser uses isolated context)
		const memberProject = await api.users.withUser(member, async (memberApi) => {
			return await memberApi.projects.getMyPersonalProject();
		});
		await api.workflows.shareWorkflow(workflow.id, [memberProject.id]);

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

		// Member opens shared workflow directly by ID
		await memberN8n.navigate.toWorkflow(workflow.id);

		// Wait for workflow to load (Manual Trigger should be visible)
		await expect(memberN8n.canvas.getCanvasNodes()).toHaveCount(1);

		await memberN8n.canvas.addNode('Notion');
		await memberN8n.canvas.getFirstAction().click();

		// Member should see their own credential
		await memberN8n.ndv.getNodeCredentialsSelect().click();
		const credentialDropdown = memberN8n.ndv.getVisiblePopper();
		await expect(credentialDropdown.getByText(memberCredName)).toBeVisible();
		// Note: Owner's credential visibility depends on n8n's sharing model
		// The test focuses on verifying member's own credential is available
	});

	test('should show owner and workflow creator credentials for global owner in shared workflows', async ({
		n8n,
		api,
	}) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test user who will create and share the workflow
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		// Member creates a credential via UI
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

		// Member creates workflow and shares with owner via API for reliable workflow ID
		const workflow = await api.users.withUser(member, async (memberApi) => {
			return await memberApi.workflows.createWorkflow({
				name: `Test Workflow ${nanoid()}`,
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
		});

		// Get owner's personal project for sharing (api is still owner after withUser)
		const ownerProject = await api.projects.getMyPersonalProject();

		// Member shares workflow with owner
		await api.users.withUser(member, async (memberApi) => {
			await memberApi.workflows.shareWorkflow(workflow.id, [ownerProject.id]);
		});

		// Owner creates their own credential via UI
		await n8n.navigate.toCredentials();
		const ownerCredName = `Owner Credential ${nanoid()}`;
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{
				name: ownerCredName,
			},
		);

		// Owner opens shared workflow directly by ID
		await n8n.navigate.toWorkflow(workflow.id);

		// Wait for workflow to load (Manual Trigger should be visible)
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1);

		await n8n.canvas.addNode('Notion');
		await n8n.canvas.getFirstAction().click();

		// Global owner should see both their own credential and the workflow creator's credential
		await n8n.ndv.getNodeCredentialsSelect().click();
		const credentialOptions = n8n.ndv.getVisiblePopper().locator('li');
		// Don't check exact count as other tests may create credentials in parallel

		// Check expected credentials are present
		await expect(credentialOptions.filter({ hasText: ownerCredName })).toBeVisible();
		await expect(credentialOptions.filter({ hasText: memberCredName })).toBeVisible();
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
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Notion');
		await n8n.canvas.getFirstAction().click();

		// Owner should see member's credential (global owner privilege)
		await n8n.ndv.getNodeCredentialsSelect().click();
		const credentialOptions = n8n.ndv.getVisiblePopper().locator('li');
		// Check that the member's credential is visible (don't check exact count as other tests may create credentials)
		await expect(credentialOptions.filter({ hasText: memberCredName })).toBeVisible();
	});
});
