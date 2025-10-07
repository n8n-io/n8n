import { MANUAL_TRIGGER_NODE_NAME } from '../../config/constants';
import { test, expect } from '../../fixtures/base';
import { n8nPage } from '../../pages/n8nPage';

const EXECUTE_WORKFLOW_NODE_NAME = 'Execute Sub-workflow';

test.describe('Workflow Selector Parameter @db:reset', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromNewProjectBlankCanvas();

		const subWorkflows = [
			{ file: 'Test_Subworkflow_Get_Weather.json', name: 'Get_Weather' },
			{ file: 'Test_Subworkflow_Search_DB.json', name: 'Search_DB' },
		];

		for (const { file } of subWorkflows) {
			await n8n.api.workflows.importWorkflowFromFile(file);
		}

		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(EXECUTE_WORKFLOW_NODE_NAME, { action: 'Execute A Sub Workflow' });
	});

	test('should render sub-workflows list', async ({ n8n }) => {
		await n8n.ndv.openResourceLocator('workflowId');

		await expect(n8n.ndv.getResourceLocatorItems()).toHaveCount(2);
		await expect(n8n.ndv.getAddResourceItem()).toHaveCount(1);
	});

	test('should show required parameter warning', async ({ n8n }) => {
		await n8n.ndv.openResourceLocator('workflowId');
		await expect(n8n.ndv.getParameterInputIssues()).toBeVisible();
	});

	test('should filter sub-workflows list', async ({ n8n }) => {
		await n8n.ndvComposer.filterWorkflowList('workflowId', 'Weather');
		await expect(n8n.ndv.getResourceLocatorItems()).toHaveCount(1);

		await n8n.ndvComposer.selectFirstFilteredWorkflow();
		const inputField = n8n.ndv.getResourceLocatorInput('workflowId').locator('input');
		await expect(inputField).toHaveValue(/Get Weather.*Test/);
	});

	test('should render sub-workflow links correctly', async ({ n8n }) => {
		await n8n.ndvComposer.selectWorkflowFromList('workflowId', 'Search DB');
		const link = n8n.ndv.getResourceLocatorInput('workflowId').locator('a');
		await expect(link).toBeVisible();

		await n8n.ndv.getExpressionModeToggle().click();
		await expect(link).toBeHidden();
	});

	test('should switch to ID mode on expression', async ({ n8n }) => {
		await n8n.ndvComposer.selectWorkflowFromList('workflowId', 'Search DB');
		const modeSelector = n8n.ndv.getResourceLocatorModeSelector('workflowId').locator('input');
		await expect(modeSelector).toHaveValue('From list');

		await n8n.ndvComposer.switchToExpressionMode('workflowId');
		await expect(modeSelector).toHaveValue('By ID');
	});

	test('should render add resource option and redirect to the correct route when clicked', async ({
		n8n,
	}) => {
		await n8n.ndv.openResourceLocator('workflowId');

		const addResourceItem = n8n.ndv.getAddResourceItem();
		await expect(addResourceItem).toHaveCount(1);
		await expect(addResourceItem.getByText(/Create a/)).toBeVisible();

		const { request, page } = await n8n.ndvComposer.createNewSubworkflowWithRedirect('workflowId');
		const requestBody = request.postDataJSON();

		expect(requestBody).toHaveProperty('name');
		expect(requestBody.name).toContain('Sub-Workflow');
		expect(requestBody.nodes).toBeInstanceOf(Array);
		expect(requestBody.nodes).toHaveLength(2);
		expect(requestBody.nodes[0]).toHaveProperty('name', 'When Executed by Another Workflow');
		expect(requestBody.nodes[1]).toHaveProperty('name', 'Replace me with your logic');

		const newPage = new n8nPage(page);
		expect(newPage.page.url()).toMatch(/\/workflow\/.+/);
		await newPage.page.close();
	});
});
