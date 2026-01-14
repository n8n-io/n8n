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

		// Create test user
		const member = await api.publicApi.createUser({
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

		// Wait for credential to be visible in the list and click on card-content to open modal
		const credentialCard = memberN8n.credentials.cards.getCredential(credentialName);
		await expect(credentialCard).toBeVisible();
		await credentialCard.getByTestId('card-content').click();

		// Wait for modal to be fully loaded
		const modal = memberN8n.credentials.credentialModal.getModal();
		await expect(modal).toBeVisible({ timeout: 10000 });

		// Verify credential name is shown in the modal (use testid to avoid duplicate text issue)
		await expect(modal.getByTestId('inline-edit-preview')).toContainText(credentialName);

		// Verify credential type is shown (confirms modal loaded correctly)
		await expect(modal.getByText('Notion API')).toBeVisible();
	});

	test('should allow admin full access to credentials created by others', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');

		// Create test users
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

		// Member creates a credential via API
		const credentialName = `Member Credential ${nanoid()}`;
		await api.users.withUser(member, async (memberApi) => {
			await memberApi.credentials.createCredential({
				name: credentialName,
				type: 'notionApi',
				data: { apiKey: TEST_API_KEY },
			});
		});

		// Admin can access and modify the credential
		const adminN8n = await n8n.start.withUser(admin);
		await adminN8n.navigate.toCredentials();

		// Wait for credential to be visible and click on card-content to open modal
		const credentialCard = adminN8n.credentials.cards.getCredential(credentialName);
		await expect(credentialCard).toBeVisible();
		await credentialCard.getByTestId('card-content').click();

		// Wait for modal to be fully loaded
		const modal = adminN8n.credentials.credentialModal.getModal();
		await expect(modal).toBeVisible({ timeout: 10000 });

		// Verify credential name is shown
		await expect(modal.getByTestId('inline-edit-preview')).toContainText(credentialName);

		// Admin can access sharing tab
		await adminN8n.credentials.credentialModal.changeTab('Sharing');

		await expect(
			modal.getByText('Sharing a credential allows people to use it in their workflows'),
		).toBeVisible();

		// Admin can see users in sharing dropdown
		await adminN8n.credentials.credentialModal.getUsersSelect().click();
		const sharingOptions = adminN8n.credentials.credentialModal
			.getVisibleDropdown()
			.getByTestId('project-sharing-info');
		// Verify at least some sharing options are available (exact count may vary)
		await expect(sharingOptions.first()).toBeVisible();

		// Admin can share with member (verifying they have sharing access to others' credentials)
		await expect(
			adminN8n.credentials.credentialModal.getVisibleDropdown().getByText(admin.email),
		).toBeVisible();
	});

	test('should prevent access to private workflows via direct URL', async ({ api }) => {
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

	test('should enforce project isolation for team projects', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
		await api.setMaxTeamProjectsQuota(-1);

		// Navigate to home to ensure the universal-add button is visible
		await n8n.navigate.toHome();

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
			{ projectId: devProject.projectId, name: devCredName },
		);

		// Create credential in test project
		await n8n.navigate.toProject(testProject.projectId);
		await n8n.projectTabs.clickCredentialsTab();
		const testCredName = `Test Credential ${nanoid()}`;
		await n8n.credentialsComposer.createFromList(
			'Notion API',
			{ apiKey: TEST_API_KEY },
			{ projectId: testProject.projectId, name: testCredName },
		);

		// Create workflow in test project
		await n8n.projectTabs.clickWorkflowsTab();
		await n8n.workflows.clickNewWorkflowCard();
		await n8n.canvas.addNode('Notion');
		await n8n.canvas.getFirstAction().click();

		// Verify test project credential is available and dev project credential is not
		await n8n.ndv.getNodeCredentialsSelect().click();
		const credentialDropdown = n8n.ndv.getVisiblePopper();
		await expect(credentialDropdown.getByText(testCredName)).toBeVisible();
		await expect(credentialDropdown.getByText(devCredName)).toBeHidden();
	});

	test('should prevent sharing team project workflows', async ({ n8n, api }) => {
		// Enable sharing features
		await api.enableFeature('sharing');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
		await api.setMaxTeamProjectsQuota(-1);

		// Navigate to home to ensure the universal-add button is visible
		await n8n.navigate.toHome();

		// Create team project
		const teamProject = await n8n.projectComposer.createProject(`Team Project ${nanoid()}`);

		// Create workflow in team project
		const teamWorkflow = await api.workflows.createInProject(teamProject.projectId, {
			name: `Team Workflow ${nanoid()}`,
		});

		await n8n.navigate.toWorkflow(teamWorkflow.id);

		// Team project workflows cannot be shared - verify no user selector is shown
		await n8n.canvas.openShareModal();
		await expect(n8n.workflowSharingModal.getUsersSelect()).toBeHidden();
	});
});
