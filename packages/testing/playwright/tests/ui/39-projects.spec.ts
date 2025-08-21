import { test, expect } from '../../fixtures/base';
import { n8nPage } from '../../pages/n8nPage';
import type { ApiHelpers } from '../../services/api-helper';

const MANUAL_TRIGGER_NODE_NAME = 'Manual Trigger';
const EXECUTE_WORKFLOW_NODE_NAME = 'Execute Sub-workflow';
const NOTION_NODE_NAME = 'Notion';
const NOTION_API_KEY = 'abc123Playwright';

// Example of using API calls in a test
async function getCredentialsForProject(api: ApiHelpers, projectId?: string) {
	const params = new URLSearchParams({
		includeScopes: 'true',
		includeData: 'true',
		...(projectId && { filter: JSON.stringify({ projectId }) }),
	});
	return await api.get('/rest/credentials', params);
}

test.describe('Projects', () => {
	test.beforeEach(async ({ api, n8n }) => {
		await api.enableFeature('sharing');
		await api.enableFeature('folders');
		await api.enableFeature('advancedPermissions');
		await api.enableFeature('projectRole:admin');
		await api.enableFeature('projectRole:editor');
		await api.setMaxTeamProjectsQuota(-1);
		await n8n.goHome();
	});

	test('should not show project add button and projects to a member if not invited to any project @auth:member', async ({
		n8n,
	}) => {
		await expect(n8n.sideBar.getAddFirstProjectButton()).toBeDisabled();
		await expect(n8n.sideBar.getProjectMenuItems()).toHaveCount(0);
	});

	test('should filter credentials by project ID', async ({ n8n, api }) => {
		const { projectName, projectId } = await n8n.projectComposer.createProject();
		await n8n.projectComposer.addCredentialToProject(
			projectName,
			'Notion API',
			'apiKey',
			NOTION_API_KEY,
		);

		const credentials = await getCredentialsForProject(api, projectId);
		expect(credentials).toHaveLength(1);

		const { projectId: project2Id } = await n8n.projectComposer.createProject();
		const credentials2 = await getCredentialsForProject(api, project2Id);
		expect(credentials2).toHaveLength(0);
	});

	test('should create sub-workflow and credential in the sub-workflow in the same project @auth:owner', async ({
		n8n,
	}) => {
		const { projectName } = await n8n.projectComposer.createProject();
		await n8n.sideBar.addWorkflowFromUniversalAdd(projectName);
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();
		await expect(
			n8n.page.getByText('Workflow successfully created', { exact: false }),
		).toBeVisible();

		await n8n.canvas.addNodeWithSubItem(EXECUTE_WORKFLOW_NODE_NAME, 'Execute A Sub Workflow');

		const subWorkflowPagePromise = n8n.page.waitForEvent('popup');

		await n8n.ndv.selectWorkflowResource(`Create a Sub-Workflow in '${projectName}'`);

		const subn8n = new n8nPage(await subWorkflowPagePromise);

		await subn8n.ndv.clickBackToCanvasButton();

		await subn8n.canvas.deleteNodeByName('Replace me with your logic');
		await subn8n.canvas.addNodeWithSubItem(NOTION_NODE_NAME, 'Append a block');

		await subn8n.credentials.createAndSaveNewCredential('apiKey', NOTION_API_KEY);

		await subn8n.ndv.clickBackToCanvasButton();
		await subn8n.canvas.saveWorkflow();

		await subn8n.page.goto('/home/workflows');
		await subn8n.sideBar.clickProjectMenuItem(projectName);
		await subn8n.page.getByRole('link', { name: 'Workflows' }).click();

		// Get Workflow Count

		await expect(subn8n.page.locator('[data-test-id="resources-list-item-workflow"]')).toHaveCount(
			2,
		);

		// Assert that the sub-workflow is in the list
		await expect(subn8n.page.getByRole('heading', { name: 'My Sub-Workflow' })).toBeVisible();

		// Navigate to Credentials
		await subn8n.page.getByRole('link', { name: 'Credentials' }).click();

		// Assert that the credential is in the list
		await expect(subn8n.page.locator('[data-test-id="resources-list-item"]')).toHaveCount(1);
		await expect(subn8n.page.getByRole('heading', { name: 'Notion account' })).toBeVisible();
	});
});
