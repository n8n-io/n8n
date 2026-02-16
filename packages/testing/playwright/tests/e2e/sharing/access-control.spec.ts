import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const TEST_API_KEY = 'test-api-key';

test.describe('Access Control Boundaries', {
	annotation: [
		{ type: 'owner', description: 'Identity & Access' },
	],
}, () => {
	test('should prevent credential editing by sharee', async ({ n8n, api }) => {
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});

		const credentialName = `Owner Credential ${nanoid()}`;
		const credential = await api.credentials.createCredential({
			name: credentialName,
			type: 'notionApi',
			data: { apiKey: TEST_API_KEY },
		});

		const memberApi = await api.createApiForUser(member);
		const memberProject = await memberApi.projects.getMyPersonalProject();
		await api.credentials.shareCredential(credential.id, [memberProject.id]);

		const memberN8n = await n8n.start.withUser(member);
		await memberN8n.navigate.toCredentials();
		await memberN8n.credentials.cards.clickCredentialCard(credentialName);

		await expect(memberN8n.credentials.credentialModal.getCredentialName()).toContainText(
			credentialName,
		);
		await expect(memberN8n.credentials.credentialModal.getSaveButton()).toBeHidden();
	});

	test('should allow admin full access to credentials created by others', async ({ n8n, api }) => {
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});
		const admin = await api.publicApi.createUser({
			email: `admin-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Admin',
			role: 'global:admin',
		});

		const credentialName = `Member Credential ${nanoid()}`;
		const memberApi = await api.createApiForUser(member);
		await memberApi.credentials.createCredential({
			name: credentialName,
			type: 'notionApi',
			data: { apiKey: TEST_API_KEY },
		});

		const adminN8n = await n8n.start.withUser(admin);
		await adminN8n.navigate.toCredentials();
		await adminN8n.credentials.cards.clickCredentialCard(credentialName);

		await expect(adminN8n.credentials.credentialModal.getCredentialName()).toContainText(
			credentialName,
		);

		const apiKeyInput = adminN8n.credentials.credentialModal.getFieldInput('apiKey');
		await expect(apiKeyInput).toHaveValue(/__n8n_BLANK_VALUE_/);

		await adminN8n.credentials.credentialModal.changeTab('Sharing');
		await expect(adminN8n.credentials.credentialModal.getUsersSelect()).toBeVisible();

		await adminN8n.credentials.credentialModal.getUsersSelect().click();
		// Personal projects show "Name (Personal space)" instead of email
		const adminName = `${admin.firstName} ${admin.lastName}`;
		await expect(
			adminN8n.credentials.credentialModal.getVisibleDropdown().getByText(adminName),
		).toBeVisible();
	});

	test('should prevent access to private workflows via direct URL', async ({ api }) => {
		const member = await api.publicApi.createUser({
			email: `member-${nanoid()}@test.com`,
			firstName: 'Test',
			lastName: 'Member',
		});
		const workflow = await api.workflows.createWorkflow({
			name: `Private Workflow ${nanoid()}`,
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
		const response = await memberApi.request.get(`/rest/workflows/${workflow.id}`);
		expect(response.status()).toBe(403);
	});

	test('should enforce project isolation for team projects', async ({ n8n, api }) => {
		await api.setMaxTeamProjectsQuota(-1);

		const devProject = await api.projects.createProject(`Development ${nanoid()}`);
		const testProject = await api.projects.createProject(`Testing ${nanoid()}`);

		const devCredName = `Dev Credential ${nanoid()}`;
		await api.credentials.createCredential({
			name: devCredName,
			type: 'notionApi',
			data: { apiKey: TEST_API_KEY },
			projectId: devProject.id,
		});

		const testCredName = `Test Credential ${nanoid()}`;
		await api.credentials.createCredential({
			name: testCredName,
			type: 'notionApi',
			data: { apiKey: TEST_API_KEY },
			projectId: testProject.id,
		});

		await n8n.navigate.toProject(testProject.id);
		await n8n.projectTabs.clickWorkflowsTab();
		await n8n.workflows.clickNewWorkflowButtonFromProject();
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Notion');
		await n8n.canvas.getFirstAction().click();

		await n8n.ndv.getNodeCredentialsSelect().click();
		const credentialDropdown = n8n.ndv.getVisiblePopper();
		await expect(credentialDropdown.getByText(testCredName)).toBeVisible();
		await expect(credentialDropdown.getByText(devCredName)).toBeHidden();
	});

	test('should prevent sharing team project workflows', async ({ n8n, api }) => {
		const teamProject = await api.projects.createProject(`Team Project ${nanoid()}`);
		const teamWorkflow = await api.workflows.createInProject(teamProject.id, {
			name: `Team Workflow ${nanoid()}`,
		});

		await n8n.navigate.toWorkflow(teamWorkflow.id);
		await n8n.canvas.openShareModal();

		// Team project workflows cannot be shared - no user selector shown
		await expect(n8n.workflowSharingModal.getUsersSelect()).toBeHidden();
	});
});
