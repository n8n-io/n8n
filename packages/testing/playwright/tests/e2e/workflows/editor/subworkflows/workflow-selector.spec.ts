import { MANUAL_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

const EXECUTE_WORKFLOW_NODE_NAME = 'Execute Sub-workflow';

test.describe('Workflow Selector Parameter', () => {
	test.beforeEach(async ({ n8n }) => {
		const projectId = await n8n.start.fromNewProjectBlankCanvas();

		const subWorkflows = [
			{ file: 'Test_Subworkflow_Get_Weather.json', name: 'Get_Weather' },
			{ file: 'Test_Subworkflow_Search_DB.json', name: 'Search_DB' },
		];

		for (const { file } of subWorkflows) {
			// Create workflow with Execute Workflow Trigger node so it can be activated
			const workflowData = {
				name: file,
				nodes: [
					{
						id: 'execute-workflow-trigger',
						name: 'When Executed by Another Workflow',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						position: [0, 0] as [number, number],
						parameters: {},
						typeVersion: 1,
					},
				],
				connections: {},
				settings: {},
				active: false,
			};
			// @ts-expect-error - projectId is not part of IWorkflowBase but is accepted by the API
			workflowData.projectId = projectId;

			const workflow = await n8n.api.workflows.createWorkflow(workflowData);
			// Activate the workflow so it appears in the workflow selector
			await n8n.api.workflows.activate(workflow.id, workflow.versionId);
		}

		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(EXECUTE_WORKFLOW_NODE_NAME, { action: 'Execute A Sub Workflow' });
	});

	test('should show required parameter warning', async ({ n8n }) => {
		await n8n.ndv.openResourceLocator('workflowId');
		await expect(n8n.ndv.getParameterInputIssues()).toBeVisible();
	});

	test('should filter sub-workflows list', async ({ n8n }) => {
		await n8n.ndvComposer.filterWorkflowList('workflowId', 'Weather');

		const items = n8n.ndv.getResourceLocatorItems();

		await expect(items.filter({ hasText: 'Search DB' })).toHaveCount(0);

		await n8n.ndvComposer.selectFirstFilteredWorkflow();
		const inputField = n8n.ndv.getResourceLocatorInput('workflowId').locator('input');
		await expect(inputField).toHaveValue(/Get_Weather/);
	});

	test('should render sub-workflow links correctly', async ({ n8n }) => {
		await n8n.ndvComposer.selectWorkflowFromList('workflowId', 'Search_DB');
		const link = n8n.ndv.getResourceLocatorInput('workflowId').locator('a');
		await expect(link).toBeVisible();

		await n8n.ndv.getExpressionModeToggle().click();
		await expect(link).toBeHidden();
	});

	test('should switch to ID mode on expression', async ({ n8n }) => {
		await n8n.ndvComposer.selectWorkflowFromList('workflowId', 'Search_DB');
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

		const secondPage = await n8n.start.fromNewPage(async () => {
			await n8n.ndvComposer.createNewSubworkflow('workflowId');
		});
		await expect(secondPage.canvas.nodeByName('When Executed by Another Workflow')).toBeVisible();
		await expect(secondPage.canvas.nodeByName('Replace me with your logic')).toBeVisible();
		await expect(secondPage.page).toHaveURL(/\/workflow\/.+/);
	});
});
