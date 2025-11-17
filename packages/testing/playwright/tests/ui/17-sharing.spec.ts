import { test, expect } from '../../fixtures/base';

const OWNER_EMAIL = 'nathan@n8n.io';
const ADMIN_EMAIL = 'admin@n8n.io';
const MEMBER_0_EMAIL = 'member@n8n.io'; // U2
const MEMBER_1_EMAIL = 'member2@n8n.io'; // U3

const TEST_API_KEY = '1234567890';
const TEST_ACCESS_TOKEN = '1234567890';

test.describe('@isolated', () => {
	test.describe.configure({ mode: 'serial' });

	test.describe('Sharing - Workflow and Credential Sharing (Sequential)', () => {
		test.beforeAll(async ({ api }) => {
			await api.resetDatabase();
			await api.enableFeature('sharing');
			await api.enableFeature('advancedPermissions');
			await api.enableFeature('projectRole:admin');
			await api.enableFeature('projectRole:editor');
		});

		test('should create C1, W1, W2, share W1 with U3, as U2', async ({ n8n }) => {
			await n8n.api.signin('member', 0);

			await n8n.credentialsComposer.createFromList(
				'Notion API',
				{ apiKey: TEST_API_KEY },
				{ name: 'Credential C1' },
			);

			await n8n.navigate.toWorkflow('new');
			await n8n.canvas.setWorkflowName('Workflow W1');
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Notion', { action: 'Append a block' });

			// Verify C1 auto-selected
			await expect(n8n.ndv.getCredentialSelect()).toHaveValue('Credential C1');
			await n8n.ndv.clickBackToCanvasButton();

			// Share W1 with U3 before saving
			await n8n.canvas.openShareModal();
			await n8n.workflowSharingModal.addUser(MEMBER_1_EMAIL);
			await n8n.workflowSharingModal.save();
			await n8n.canvas.saveWorkflow();

			await n8n.navigate.toWorkflows();
			await n8n.sideBar.addWorkflowFromUniversalAdd('Personal');
			await n8n.canvas.importWorkflow('Test_workflow_1.json', 'Workflow W2');
		});

		test('should create C2, share C2 with U1 and U2, as U3', async ({ n8n }) => {
			await n8n.api.signin('member', 1);

			// Manual approach to access Sharing tab during creation
			await n8n.navigate.toCredentials();
			await n8n.credentials.addResource.credential();
			await n8n.credentials.selectCredentialType('Airtable Personal Access Token API');

			await n8n.credentials.credentialModal.fillField('accessToken', TEST_ACCESS_TOKEN);
			await n8n.credentials.credentialModal.getCredentialName().click();
			await n8n.credentials.credentialModal.getNameInput().fill('Credential C2');

			await n8n.credentials.credentialModal.changeTab('Sharing');
			await n8n.credentials.credentialModal.addUserToSharing(OWNER_EMAIL);
			await n8n.credentials.credentialModal.addUserToSharing(MEMBER_0_EMAIL);
			await n8n.credentials.credentialModal.saveSharing();
			await n8n.credentials.credentialModal.close();
		});

		test('should open W1, add node using C2 as U3', async ({ n8n }) => {
			await n8n.api.signin('member', 1);

			await n8n.navigate.toWorkflows();

			// U3 only sees W1 (not W2)
			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(1);
			await expect(n8n.workflows.cards.getWorkflow('Workflow W1')).toBeVisible();

			await n8n.workflows.cards.getWorkflow('Workflow W1').click();

			await n8n.canvas.addNode('Airtable', { action: 'Create a record' });
			await expect(n8n.ndv.getCredentialSelect()).toHaveValue('Credential C2');
			await n8n.ndv.clickBackToCanvasButton();
			await n8n.canvas.saveWorkflow();

			await n8n.canvas.openNode('Append a block');

			// C1 is shown but disabled (U3 doesn't own it)
			await expect(n8n.ndv.getNodeCredentialsSelect()).toHaveValue('Credential C1');
			await expect(n8n.ndv.getNodeCredentialsSelect()).toBeDisabled();

			await n8n.ndv.clickBackToCanvasButton();
		});

		test('should open W1, add node using C2 as U2', async ({ n8n }) => {
			await n8n.api.signin('member', 0);

			await n8n.navigate.toWorkflows();

			// U2 sees W1 and W2 (both owned by U2)
			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(2);
			await expect(n8n.workflows.cards.getWorkflow('Workflow W1')).toBeVisible();
			await expect(n8n.workflows.cards.getWorkflow('Workflow W2')).toBeVisible();

			await n8n.workflows.cards.getWorkflow('Workflow W1').click();

			await n8n.canvas.addNode('Airtable', { action: 'Create a record' });
			await expect(n8n.ndv.getCredentialSelect()).toHaveValue('Credential C2');
			await n8n.ndv.clickBackToCanvasButton();
			await n8n.canvas.saveWorkflow();

			await n8n.canvas.openNode('Append a block');

			// C1 is enabled (U2 owns it)
			await expect(n8n.ndv.getNodeCredentialsSelect().locator('input')).toHaveValue(
				'Credential C1',
			);
			await expect(n8n.ndv.getNodeCredentialsSelect().locator('input')).toBeEnabled();

			await n8n.ndv.clickBackToCanvasButton();
		});

		test('should not have access to W2, as U3', async ({ n8n }) => {
			const w2 = await n8n.workflowComposer.getWorkflowByName('Workflow W2');

			await n8n.api.signin('member', 1);

			await n8n.page.goto(`/workflow/${w2.id}`);

			await expect(n8n.page).toHaveURL('/entity-not-authorized/workflow');
		});

		test('should have access to W1, W2, as U1', async ({ n8n }) => {
			await n8n.api.signin('owner');

			await n8n.navigate.toWorkflows();

			// Owner sees W1 and W2 (created by U2)
			await expect(n8n.workflows.cards.getWorkflows()).toHaveCount(2);
			await expect(n8n.workflows.cards.getWorkflow('Workflow W1')).toBeVisible();
			await expect(n8n.workflows.cards.getWorkflow('Workflow W2')).toBeVisible();

			await n8n.workflows.cards.getWorkflow('Workflow W1').click();

			// C1 is enabled for owner
			await n8n.canvas.openNode('Append a block');
			await expect(n8n.ndv.getNodeCredentialsSelect().locator('input')).toHaveValue(
				'Credential C1',
			);
			await expect(n8n.ndv.getNodeCredentialsSelect().locator('input')).toBeEnabled();
			await n8n.ndv.clickBackToCanvasButton();

			await n8n.navigate.toWorkflows();

			await n8n.workflows.cards.getWorkflow('Workflow W2').click();
			await n8n.canvas.clickExecuteWorkflowButton();
		});

		test('should automatically test C2 when opened by U2 sharee', async ({ n8n }) => {
			await n8n.api.signin('member', 0);

			await n8n.navigate.toCredentials();

			await n8n.credentials.cards.getCredential('Credential C2').click();

			await expect(n8n.credentials.credentialModal.getTestSuccessTag()).toBeVisible();
		});

		test('should work for admin role on credentials created by others', async ({ n8n }) => {
			await n8n.api.signin('member', 0);
			await n8n.navigate.toCredentials();
			await n8n.credentials.addResource.credential();
			await n8n.credentials.selectCredentialType('Notion API');
			await n8n.credentials.credentialModal.fillField('apiKey', TEST_API_KEY);
			await n8n.credentials.credentialModal.renameCredential('Credential C3');
			await n8n.credentials.credentialModal.save();
			await n8n.credentials.credentialModal.close();

			await n8n.api.signin('admin');
			await n8n.navigate.toCredentials();
			await n8n.credentials.cards.getCredential('Credential C3').click();

			await expect(n8n.credentials.credentialModal.getTestSuccessTag()).toBeVisible();

			// Admin cannot see sensitive data (masked)
			const passwordInput = n8n.credentials.credentialModal
				.getCredentialInputs()
				.locator('input')
				.first();
			const inputValue = await passwordInput.inputValue();
			expect(inputValue).toContain('__n8n_BLANK_VALUE_');

			await n8n.credentials.credentialModal.changeTab('Sharing');

			await expect(
				n8n.credentials.credentialModal
					.getModal()
					.getByText('Sharing a credential allows people to use it in their workflows'),
			).toBeVisible();

			await n8n.credentials.credentialModal.getUsersSelect().click();

			await expect(
				n8n.credentials.credentialModal.getVisibleDropdown().getByTestId('project-sharing-info'),
			).toHaveCount(3);

			// Admin can share with self
			await expect(
				n8n.credentials.credentialModal.getVisibleDropdown().getByText('admin@n8n.io'),
			).toBeVisible();

			await n8n.credentials.credentialModal.getVisibleDropdown().getByText(OWNER_EMAIL).click();

			await n8n.credentials.credentialModal.addUserToSharing(MEMBER_1_EMAIL);
			await n8n.credentials.credentialModal.addUserToSharing(ADMIN_EMAIL);

			await n8n.credentials.credentialModal.saveSharing();
			await n8n.credentials.credentialModal.close();
		});

		test('credentials should work between team and personal projects', async ({ n8n, api }) => {
			await api.resetDatabase();

			await api.enableFeature('sharing');
			await api.enableFeature('advancedPermissions');
			await api.enableFeature('projectRole:admin');
			await api.enableFeature('projectRole:editor');
			await api.setMaxTeamProjectsQuota(-1);

			await n8n.api.signin('owner');
			await n8n.navigate.toHome();

			await n8n.projectComposer.createProject('Development');

			await n8n.sideBar.clickHomeButton();
			await n8n.workflows.clickNewWorkflowCard();
			await n8n.canvas.importWorkflow('Test_workflow_1.json', 'Test workflow');

			await n8n.sideBar.clickHomeButton();
			await n8n.projectTabs.clickCredentialsTab();
			await n8n.credentials.emptyListCreateCredentialButton.click();
			await n8n.credentials.selectCredentialType('Notion API');
			await n8n.credentials.credentialModal.fillField('apiKey', TEST_API_KEY);
			await n8n.credentials.credentialModal.renameCredential('Notion API');
			await n8n.credentials.credentialModal.save();
			await n8n.credentials.credentialModal.close();

			await n8n.credentials.cards.getCredential('Notion API').click();
			await n8n.credentials.credentialModal.changeTab('Sharing');
			await n8n.credentials.credentialModal.getUsersSelect().click();

			const sharingDropdown = n8n.credentials.credentialModal.getVisibleDropdown();
			await expect(sharingDropdown.locator('li')).toHaveCount(4);
			await expect(sharingDropdown.getByText('Development')).toBeVisible();

			await sharingDropdown.getByText('Development').click();
			await n8n.credentials.credentialModal.saveSharing();
			await n8n.credentials.credentialModal.close();

			await n8n.projectTabs.clickWorkflowsTab();
			await n8n.workflows.shareWorkflow('Test workflow');

			await n8n.workflowSharingModal.getUsersSelect().click();
			const workflowSharingDropdown = n8n.workflowSharingModal.getVisibleDropdown();
			await expect(workflowSharingDropdown.locator('li')).toHaveCount(3);

			await workflowSharingDropdown.locator('li').first().click();
			await n8n.workflowSharingModal.save();

			await n8n.sideBar.getProjectMenuItems().first().click();
			await n8n.workflows.clickNewWorkflowCard();
			await n8n.canvas.importWorkflow('Test_workflow_1.json', 'Test workflow 2');

			// Team project workflow cannot be shared
			await n8n.canvas.openShareModal();
			await expect(n8n.workflowSharingModal.getUsersSelect()).toHaveCount(0);

			await n8n.workflowSharingModal.close();

			await n8n.sideBar.getProjectMenuItems().first().click();
			await n8n.projectTabs.clickCredentialsTab();
			await n8n.credentials.addResource.credential();
			await n8n.credentials.selectCredentialType('Notion API');
			await n8n.credentials.credentialModal.fillField('apiKey', TEST_API_KEY);
			await n8n.credentials.credentialModal.renameCredential('Notion API 2');
			await n8n.credentials.credentialModal.save();

			await n8n.credentials.credentialModal.changeTab('Sharing');
			await n8n.credentials.credentialModal.getUsersSelect().click();

			const sharingDropdown2 = n8n.credentials.credentialModal.getVisibleDropdown();
			await expect(sharingDropdown2.locator('li')).toHaveCount(4);

			await sharingDropdown2.locator('li').first().click();
			await n8n.credentials.credentialModal.saveSharing();
			await n8n.credentials.credentialModal.close();

			// One credential labeled "Personal"
			await expect(n8n.credentials.cards.getCredentials()).toHaveCount(2);
			await expect(
				n8n.credentials.cards.getCredentials().filter({ hasText: 'Personal' }),
			).toHaveCount(1);
		});
	});

	test.describe('Credential Usage in Cross Shared Workflows', () => {
		test.beforeEach(async ({ n8n, api }) => {
			await api.resetDatabase();
			await api.enableFeature('sharing');
			await api.enableFeature('advancedPermissions');
			await api.enableFeature('projectRole:admin');
			await api.enableFeature('projectRole:editor');
			await api.setMaxTeamProjectsQuota(-1);

			await n8n.api.signin('owner');
			await n8n.navigate.toCredentials();
		});

		test('should only show credentials from the same team project', async ({ n8n }) => {
			await n8n.credentialsComposer.createFromList('Notion API', { apiKey: 'test' });

			const devProject = await n8n.projectComposer.createProject('Development');
			await n8n.projectTabs.clickCredentialsTab();
			await n8n.credentialsComposer.createFromList(
				'Notion API',
				{ apiKey: 'test' },
				{ projectId: devProject.projectId },
			);

			const testProject = await n8n.projectComposer.createProject('Test');
			await n8n.projectTabs.clickCredentialsTab();
			await n8n.credentialsComposer.createFromList(
				'Notion API',
				{ apiKey: 'test' },
				{ projectId: testProject.projectId },
			);

			await n8n.projectTabs.clickWorkflowsTab();
			await n8n.workflows.clickNewWorkflowCard();

			await n8n.canvas.addNode('Notion');
			await n8n.canvas.getFirstAction().click();

			// Only Test project credential visible
			await n8n.ndv.getNodeCredentialsSelect().click();
			await expect(n8n.ndv.getVisiblePopper().locator('li')).toHaveCount(1);
		});

		test('should only show credentials in their personal project for members', async ({ n8n }) => {
			await n8n.credentialsComposer.createFromList('Notion API', { apiKey: 'test' });

			await n8n.navigate.toCredentials();
			await n8n.credentials.addResource.credential();
			await n8n.credentials.selectCredentialType('Notion API');
			await n8n.credentials.credentialModal.fillField('apiKey', 'test');
			await n8n.credentials.credentialModal.save();

			await n8n.credentials.credentialModal.changeTab('Sharing');
			await n8n.credentials.credentialModal.addUserToSharing(MEMBER_0_EMAIL);
			await n8n.credentials.credentialModal.saveSharing();
			await n8n.credentials.credentialModal.close();

			await n8n.api.signin('member', 0);
			await n8n.navigate.toCredentials();
			await n8n.credentialsComposer.createFromList('Notion API', { apiKey: 'test' });

			await n8n.navigate.toWorkflows();
			await n8n.sideBar.addWorkflowFromUniversalAdd('Personal');

			await n8n.canvas.addNode('Notion');
			await n8n.canvas.getFirstAction().click();

			// Own credential and shared credential visible
			await n8n.ndv.getNodeCredentialsSelect().click();
			await expect(n8n.ndv.getVisiblePopper().locator('li')).toHaveCount(2);
		});

		test('should only show credentials in their personal project for members if the workflow was shared with them', async ({
			n8n,
		}) => {
			const workflowName = 'Test workflow';

			await n8n.credentialsComposer.createFromList('Notion API', { apiKey: 'test' });

			await n8n.navigate.toWorkflows();
			await n8n.sideBar.addWorkflowFromUniversalAdd('Personal');
			await n8n.canvas.setWorkflowName(workflowName);
			await n8n.page.keyboard.press('Enter');
			await n8n.canvas.openShareModal();
			await n8n.workflowSharingModal.addUser(MEMBER_0_EMAIL);
			await n8n.workflowSharingModal.save();

			await n8n.api.signin('member', 0);
			await n8n.navigate.toCredentials();
			await n8n.credentialsComposer.createFromList('Notion API', { apiKey: 'test' });

			await n8n.navigate.toWorkflows();
			await n8n.workflows.cards.getWorkflow(workflowName).click();

			await n8n.canvas.addNode('Notion');
			await n8n.canvas.getFirstAction().click();

			// Only own credential visible (not owner's)
			await n8n.ndv.getNodeCredentialsSelect().click();
			await expect(n8n.ndv.getVisiblePopper().locator('li')).toHaveCount(1);
		});

		test("should show all credentials from all personal projects the workflow's been shared into for the global owner", async ({
			n8n,
		}) => {
			const workflowName = 'Test workflow';

			await n8n.api.signin('member', 1);
			await n8n.navigate.toCredentials();
			await n8n.credentials.addResource.credential();
			await n8n.credentials.selectCredentialType('Notion API');
			await n8n.credentials.credentialModal.fillField('apiKey', 'test');
			await n8n.credentials.credentialModal.save();
			await n8n.credentials.credentialModal.close();

			await n8n.api.signin('admin');
			await n8n.navigate.toCredentials();
			await n8n.credentials.addResource.credential();
			await n8n.credentials.selectCredentialType('Notion API');
			await n8n.credentials.credentialModal.fillField('apiKey', 'test');
			await n8n.credentials.credentialModal.save();
			await n8n.credentials.credentialModal.close();

			await n8n.api.signin('member', 0);
			await n8n.navigate.toCredentials();
			await n8n.credentialsComposer.createFromList('Notion API', { apiKey: 'test' });
			await n8n.navigate.toWorkflows();
			await n8n.sideBar.addWorkflowFromUniversalAdd('Personal');
			await n8n.canvas.setWorkflowName(workflowName);
			await n8n.page.keyboard.press('Enter');
			await n8n.canvas.openShareModal();
			await n8n.workflowSharingModal.addUser(OWNER_EMAIL);
			await n8n.workflowSharingModal.addUser(ADMIN_EMAIL);
			await n8n.workflowSharingModal.save();

			await n8n.api.signin('owner');
			await n8n.navigate.toCredentials();
			await n8n.credentialsComposer.createFromList('Notion API', { apiKey: 'test' });
			await n8n.navigate.toWorkflows();
			await n8n.workflows.cards.getWorkflow(workflowName).click();

			await n8n.canvas.addNode('Notion');
			await n8n.canvas.getFirstAction().click();

			// Owner sees 3 credentials: admin's, U2's, owner's
			await n8n.ndv.getNodeCredentialsSelect().click();
			await expect(n8n.ndv.getVisiblePopper().locator('li')).toHaveCount(3);
		});

		test('should show all personal credentials if the global owner owns the workflow', async ({
			n8n,
		}) => {
			await n8n.api.signin('member', 0);
			await n8n.navigate.toCredentials();
			await n8n.credentials.addResource.credential();
			await n8n.credentials.selectCredentialType('Notion API');
			await n8n.credentials.credentialModal.fillField('apiKey', 'test');
			await n8n.credentials.credentialModal.save();
			await n8n.credentials.credentialModal.close();

			await n8n.api.signin('owner');
			await n8n.navigate.toWorkflows();
			await n8n.sideBar.addWorkflowFromUniversalAdd('Personal');
			await n8n.canvas.addNode('Notion');
			await n8n.canvas.getFirstAction().click();

			// Owner sees member's credential (global owner privilege)
			await n8n.ndv.getNodeCredentialsSelect().click();
			await expect(n8n.ndv.getVisiblePopper().locator('li')).toHaveCount(1);
		});
	});
});
