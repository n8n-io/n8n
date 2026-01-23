import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const TEST_API_KEY = 'test-api-key';

test.describe('Credential Visibility Rules', () => {
	test('should only show credentials from the same team project', async ({ n8n, api }) => {
		await n8n.navigate.toCredentials();
		const personalCredName = `Personal Credential ${nanoid()}`;
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{
				name: personalCredName,
			},
		);

		const devProject = await n8n.projectComposer.createProject(`Development ${nanoid()}`);
		await n8n.projectTabs.clickCredentialsTab();
		const devCredName = `Dev Credential ${nanoid()}`;
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{ projectId: devProject.projectId, name: devCredName },
		);

		const testProject = await api.projects.createProject(`Test ${nanoid()}`);
		await n8n.navigate.toProject(testProject.id);
		await n8n.projectTabs.clickCredentialsTab();
		const testCredName = `Test Credential ${nanoid()}`;
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{ projectId: testProject.id, name: testCredName },
		);

		await n8n.navigate.toProject(testProject.id);
		await n8n.projectTabs.clickWorkflowsTab();
		await n8n.workflows.clickNewWorkflowButtonFromProject();
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Notion');
		await n8n.canvas.getFirstAction().click();

		// Only test project credential should be visible
		await n8n.ndv.getNodeCredentialsSelect().click();
		const credentialDropdown = n8n.ndv.getVisiblePopper();
		await expect(credentialDropdown.getByText(testCredName)).toBeVisible();
		await expect(credentialDropdown.getByText(personalCredName)).toBeHidden();
		await expect(credentialDropdown.getByText(devCredName)).toBeHidden();
	});

	test('should show personal and shared credentials for members', async ({ n8n, api }) => {
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

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
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		const ownerCredName = `Owner Credential ${nanoid()}`;
		await n8n.navigate.toCredentials();
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{ name: ownerCredName },
		);

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

		const memberApi = await api.createApiForUser(member);
		const memberProject = await memberApi.projects.getMyPersonalProject();
		await api.workflows.shareWorkflow(workflow.id, [memberProject.id]);

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

		await memberN8n.navigate.toWorkflow(workflow.id);
		await expect(memberN8n.canvas.getCanvasNodes().first()).toBeVisible();

		await memberN8n.canvas.addNode('Notion');
		await memberN8n.canvas.getFirstAction().click();

		// Member should see their own credential but NOT the owner's unshared credential
		await memberN8n.ndv.getNodeCredentialsSelect().click();
		const credentialDropdown = memberN8n.ndv.getVisiblePopper();
		await expect(credentialDropdown.getByText(memberCredName)).toBeVisible();
		await expect(credentialDropdown.getByText(ownerCredName)).toBeHidden();
	});

	test('should show owner and workflow creator credentials for global owner in shared workflows', async ({
		n8n,
		api,
	}) => {
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		const memberApi = await api.createApiForUser(member);
		const memberCredName = `Member Credential ${nanoid()}`;
		await memberApi.credentials.createCredential({
			name: memberCredName,
			type: 'notionApi',
			data: { apiKey: TEST_API_KEY },
		});

		const workflow = await memberApi.workflows.createWorkflow({
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

		const ownerProject = await api.projects.getMyPersonalProject();
		await memberApi.workflows.shareWorkflow(workflow.id, [ownerProject.id]);

		const ownerCredName = `Owner Credential ${nanoid()}`;
		await api.credentials.createCredential({
			name: ownerCredName,
			type: 'notionApi',
			data: { apiKey: TEST_API_KEY },
		});

		await n8n.navigate.toWorkflow(workflow.id);
		await expect(n8n.canvas.getCanvasNodes().first()).toBeVisible();

		await n8n.canvas.addNode('Notion');
		await n8n.canvas.getFirstAction().click();

		// Global owner should see both their own credential and the workflow creator's credential
		await n8n.ndv.getNodeCredentialsSelect().click();
		const credentialOptions = n8n.ndv.getVisiblePopper().locator('li');
		await expect(credentialOptions.filter({ hasText: ownerCredName })).toBeVisible();
		await expect(credentialOptions.filter({ hasText: memberCredName })).toBeVisible();
	});

	test('should show all personal credentials for global owner in own workflows', async ({
		n8n,
		api,
	}) => {
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		const memberApi = await api.createApiForUser(member);
		const memberCredName = `Member Credential ${nanoid()}`;
		await memberApi.credentials.createCredential({
			name: memberCredName,
			type: 'notionApi',
			data: { apiKey: TEST_API_KEY },
		});

		await n8n.navigate.toWorkflow('new');
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Notion');
		await n8n.canvas.getFirstAction().click();

		// Owner should see member's credential (global owner privilege)
		await n8n.ndv.getNodeCredentialsSelect().click();
		const credentialOptions = n8n.ndv.getVisiblePopper().locator('li');
		await expect(credentialOptions.filter({ hasText: memberCredName })).toBeVisible();
	});
});
