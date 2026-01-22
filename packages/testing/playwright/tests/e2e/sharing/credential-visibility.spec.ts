import { test, expect } from '../../../fixtures/base';

const OWNER_EMAIL = 'nathan@n8n.io';
const ADMIN_EMAIL = 'admin@n8n.io';
const MEMBER_0_EMAIL = 'member@n8n.io'; // U2

test.describe('@isolated', () => {
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
			await n8n.workflows.clickNewWorkflowButtonFromProject();

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

			await n8n.navigate.toWorkflow('new');

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

			await n8n.navigate.toWorkflow('new');
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
			await n8n.navigate.toWorkflow('new');
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
			await n8n.navigate.toWorkflow('new');
			await n8n.canvas.addNode('Notion');
			await n8n.canvas.getFirstAction().click();

			// Owner sees member's credential (global owner privilege)
			await n8n.ndv.getNodeCredentialsSelect().click();
			await expect(n8n.ndv.getVisiblePopper().locator('li')).toHaveCount(1);
		});
	});
});
