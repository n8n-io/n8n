import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

type WorkflowApiForExecutionAssertions = {
	getWorkflows(): Promise<Array<{ id?: string; name?: string; nodes?: Array<{ name: string }> }>>;
	getWorkflow(workflowId: string): Promise<{ name?: string; nodes?: Array<{ name: string }> }>;
	getExecutions(workflowId: string, limit?: number): Promise<Array<{ status?: string }>>;
};

async function getSuccessfulExecutionCountForNode(
	workflowsApi: WorkflowApiForExecutionAssertions,
	nodeName: string,
): Promise<number> {
	const workflows = await workflowsApi.getWorkflows();
	let executionCount = 0;

	for (const workflowSummary of workflows) {
		if (!workflowSummary.id) continue;

		const workflow = workflowSummary.nodes
			? workflowSummary
			: await workflowsApi.getWorkflow(workflowSummary.id);

		const matchesNode =
			workflow.name?.toLowerCase().includes(nodeName) ??
			workflow.nodes?.some((node) => node.name.toLowerCase().includes(nodeName));
		if (!matchesNode) continue;

		const executions = await workflowsApi.getExecutions(workflowSummary.id, 20);
		executionCount += executions.filter((execution) => execution.status === 'success').length;
	}

	return executionCount;
}

test.describe(
	'Instance AI workflow execution @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test.describe.configure({ timeout: 180_000 });

		test('should show run workflow button in preview', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "run button visibility test"',
			);

			// Wait for preview to show canvas nodes
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});

			// The run workflow button should be visible inside the preview iframe
			await expect(n8n.instanceAi.getPreviewRunWorkflowButton()).toBeVisible({
				timeout: 10_000,
			});
		});

		test('should execute workflow from run button and show success indicators', async ({ n8n }) => {
			test.setTimeout(180_000);

			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with the "When clicking Test workflow" trigger connected to a set node called "full execution test". Use the trigger that runs from the editor Test workflow button.',
			);

			// Wait for preview to show canvas nodes
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});

			// Click the run workflow button
			await n8n.instanceAi.runPreviewWorkflow();

			// Nodes should show success indicators after execution completes
			await expect(n8n.instanceAi.getPreviewSuccessIndicators().first()).toBeVisible({
				timeout: 120_000,
			});
		});

		test('should execute individual node from node toolbar', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger connected to a set node called "node execution test"',
			);

			// Wait for preview to show canvas nodes
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});

			// Hover over the Set node to show its toolbar
			const setNode = n8n.instanceAi.getPreviewNodeByName('node execution test');
			await expect(setNode).toBeVisible({ timeout: 10_000 });
			await setNode.hover();

			// Click the execute node button on the toolbar
			await n8n.instanceAi.executePreviewNodeByName('node execution test');

			// The node should show a success indicator after execution
			await expect(
				n8n.instanceAi.getPreviewNodeSuccessIndicator('node execution test'),
			).toBeVisible({ timeout: 30_000 });
		});

		test('should show execution results in NDV output panel when opening node after execution', async ({
			n8n,
		}) => {
			test.setTimeout(180_000);

			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger connected to a set node called "ndv output test"',
			);

			// Wait for preview to show canvas nodes
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});

			// Execute the workflow
			await n8n.instanceAi.runPreviewWorkflow();

			// Wait for execution to complete
			await expect(n8n.instanceAi.getPreviewSuccessIndicators().first()).toBeVisible({
				timeout: 30_000,
			});

			// Double-click the Set node to open NDV
			await n8n.instanceAi.openLastPreviewNode();

			// The NDV output panel should be visible with execution data
			await expect(n8n.instanceAi.getPreviewNdvOutputPanel()).toBeVisible({
				timeout: 10_000,
			});
		});

		test('should allow re-running workflow after initial execution', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger connected to a set node called "re-run test"',
			);

			// Wait for preview to show canvas nodes
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});

			const executionCountBeforeFirstRun = await getSuccessfulExecutionCountForNode(
				n8n.api.workflows,
				're-run test',
			);

			// First execution
			await n8n.instanceAi.runPreviewWorkflow();
			await expect(n8n.instanceAi.getPreviewSuccessIndicators().first()).toBeVisible({
				timeout: 30_000,
			});

			let executionCountAfterFirstRun = executionCountBeforeFirstRun;
			await expect
				.poll(async () => {
					executionCountAfterFirstRun = await getSuccessfulExecutionCountForNode(
						n8n.api.workflows,
						're-run test',
					);
					return executionCountAfterFirstRun;
				})
				.toBeGreaterThan(executionCountBeforeFirstRun);

			// Run workflow button should still be visible for re-execution
			await expect(n8n.instanceAi.getPreviewRunWorkflowButton()).toBeVisible({
				timeout: 10_000,
			});

			await n8n.instanceAi.runPreviewWorkflow();
			await expect
				.poll(
					async () => await getSuccessfulExecutionCountForNode(n8n.api.workflows, 're-run test'),
				)
				.toBeGreaterThan(executionCountAfterFirstRun);
			await expect(n8n.instanceAi.getPreviewSuccessIndicators().first()).toBeVisible({
				timeout: 10_000,
			});
		});
	},
);
