import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

function seededExecutionWorkflow(name: string, setNodeName: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			{
				id: 'manual-trigger',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'set-node',
				name: setNodeName,
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [240, 0],
				parameters: {
					assignments: {
						assignments: [
							{
								id: 'status-assignment',
								name: 'status',
								value: 'seeded',
								type: 'string',
							},
						],
					},
					options: {},
				},
			},
			{
				id: 'terminal-node',
				name: `${setNodeName} terminal`,
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [480, 0],
				parameters: {},
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: setNodeName, type: 'main', index: 0 }]],
			},
			[setNodeName]: {
				main: [[{ node: `${setNodeName} terminal`, type: 'main', index: 0 }]],
			},
		},
		settings: {},
	};
}

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
	const lowerNodeName = nodeName.toLowerCase();
	let executionCount = 0;

	for (const workflowSummary of workflows) {
		if (!workflowSummary.id) continue;

		const workflow = workflowSummary.nodes
			? workflowSummary
			: await workflowsApi.getWorkflow(workflowSummary.id);

		const matchesNode =
			workflow.name?.toLowerCase().includes(lowerNodeName) === true ||
			workflow.nodes?.some((node) => node.name.toLowerCase().includes(lowerNodeName)) === true;
		if (!matchesNode) continue;

		const executions = await workflowsApi.getExecutions(workflowSummary.id, 20);
		executionCount += executions.filter((execution) => execution.status === 'success').length;
	}

	return executionCount;
}

test.describe(
	'Instance AI workflow execution @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test.describe.configure({ timeout: 180_000 });

		test('should show run workflow button in preview', async ({ n8n }) => {
			const workflowName = 'Run Button Visibility Workflow';
			await n8n.api.workflows.createWorkflow(
				seededExecutionWorkflow(workflowName, 'run button visibility test'),
			);

			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				`Edit the existing workflow named "${workflowName}". Change the Set node named "run button visibility test" so the "status" field value is exactly "ready". Do not create a new workflow. Save it only; do not run it after editing.`,
			);

			await n8n.instanceAi.waitForPreviewCanvasNode('run button visibility test');

			// The run workflow button should be visible inside the preview iframe
			await expect(n8n.instanceAi.getPreviewRunWorkflowButton()).toBeVisible({
				timeout: 10_000,
			});
		});

		test('should execute workflow from run button and show success indicators', async ({ n8n }) => {
			test.setTimeout(180_000);
			const workflowName = 'Full Execution Workflow';
			await n8n.api.workflows.createWorkflow(
				seededExecutionWorkflow(workflowName, 'full execution test'),
			);

			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				`Edit the existing workflow named "${workflowName}". Change the Set node named "full execution test" so the "status" field value is exactly "ready". Do not create a new workflow. Save it only; do not run it after editing.`,
			);

			await n8n.instanceAi.waitForPreviewCanvasNode('full execution test');

			const executionCountBeforeRun = await getSuccessfulExecutionCountForNode(
				n8n.api.workflows,
				'full execution test',
			);

			// Click the run workflow button
			await n8n.instanceAi.runPreviewWorkflow();

			await expect
				.poll(
					async () =>
						await getSuccessfulExecutionCountForNode(n8n.api.workflows, 'full execution test'),
					{ intervals: [1_000, 2_000, 5_000], timeout: 120_000 },
				)
				.toBeGreaterThan(executionCountBeforeRun);
			await expect(
				n8n.instanceAi.getPreviewNodeSuccessIndicator('full execution test'),
			).toBeVisible({ timeout: 30_000 });
		});

		test(
			'should execute individual node from node toolbar',
			{
				annotation: [
					{
						type: 'expectation-slug',
						description: 'should-show-run-workflow-button-in-preview',
					},
				],
			},
			async ({ n8n }) => {
				const workflowName = 'Run Button Visibility Workflow';
				const setNodeName = 'run button visibility test';
				await n8n.api.workflows.createWorkflow(seededExecutionWorkflow(workflowName, setNodeName));

				await n8n.navigate.toInstanceAi();

				await n8n.instanceAi.sendMessage(
					`Edit the existing workflow named "${workflowName}". Change the Set node named "${setNodeName}" so the "status" field value is exactly "ready". Do not create a new workflow. Save it only; do not run it after editing.`,
				);

				await n8n.instanceAi.waitForPreviewCanvasNode(setNodeName);

				// Hover over the Set node to show its toolbar
				const setNode = n8n.instanceAi.getPreviewNodeByName(setNodeName);
				await expect(setNode).toBeVisible({ timeout: 10_000 });
				await setNode.hover();

				// Click the execute node button on the toolbar
				await n8n.instanceAi.executePreviewNodeByName(setNodeName);

				// The node should show a success indicator after execution
				await expect(n8n.instanceAi.getPreviewNodeSuccessIndicator(setNodeName)).toBeVisible({
					timeout: 30_000,
				});
			},
		);

		test('should show execution results in NDV output panel when opening node after execution', async ({
			n8n,
		}) => {
			test.setTimeout(180_000);
			const workflowName = 'NDV Output Workflow';
			await n8n.api.workflows.createWorkflow(
				seededExecutionWorkflow(workflowName, 'ndv output test'),
			);

			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				`Edit the existing workflow named "${workflowName}". Change the Set node named "ndv output test" so the "status" field value is exactly "ready". Do not create a new workflow. Save it only; do not run it after editing, do not search the web, and do not ask for clarification.`,
			);

			await n8n.instanceAi.waitForPreviewCanvasNode('ndv output test');

			const executionCountBeforeRun = await getSuccessfulExecutionCountForNode(
				n8n.api.workflows,
				'ndv output test',
			);

			// Execute the workflow
			await n8n.instanceAi.runPreviewWorkflow();

			// Wait for execution to complete
			await expect
				.poll(
					async () =>
						await getSuccessfulExecutionCountForNode(n8n.api.workflows, 'ndv output test'),
					{ intervals: [1_000, 2_000, 5_000], timeout: 120_000 },
				)
				.toBeGreaterThan(executionCountBeforeRun);
			await expect(n8n.instanceAi.getPreviewNodeSuccessIndicator('ndv output test')).toBeVisible({
				timeout: 30_000,
			});

			// Double-click the Set node to open NDV
			await n8n.instanceAi.openPreviewNodeByName('ndv output test');

			// The NDV output panel should be visible with execution data
			await expect(n8n.instanceAi.getPreviewNdvOutputPanel()).toBeVisible({
				timeout: 10_000,
			});
		});

		test('should allow re-running workflow after initial execution', async ({ n8n }) => {
			const workflowName = 'Re-run Execution Workflow';
			await n8n.api.workflows.createWorkflow(seededExecutionWorkflow(workflowName, 're-run test'));

			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				`Edit the existing workflow named "${workflowName}". Change the Set node named "re-run test" so the "status" field value is exactly "ready". Do not create a new workflow. Save it only; do not run it after editing.`,
			);

			await n8n.instanceAi.waitForPreviewCanvasNode('re-run test');

			const executionCountBeforeFirstRun = await getSuccessfulExecutionCountForNode(
				n8n.api.workflows,
				're-run test',
			);

			// First execution
			await n8n.instanceAi.runPreviewWorkflow();
			await expect(n8n.instanceAi.getPreviewNodeSuccessIndicator('re-run test')).toBeVisible({
				timeout: 30_000,
			});

			let executionCountAfterFirstRun = executionCountBeforeFirstRun;
			await expect
				.poll(
					async () => {
						executionCountAfterFirstRun = await getSuccessfulExecutionCountForNode(
							n8n.api.workflows,
							're-run test',
						);
						return executionCountAfterFirstRun;
					},
					{ intervals: [1_000, 2_000, 5_000], timeout: 120_000 },
				)
				.toBeGreaterThan(executionCountBeforeFirstRun);

			// Run workflow button should still be visible for re-execution
			await expect(n8n.instanceAi.getPreviewRunWorkflowButton()).toBeVisible({
				timeout: 10_000,
			});

			await n8n.instanceAi.runPreviewWorkflow();
			await expect
				.poll(
					async () => await getSuccessfulExecutionCountForNode(n8n.api.workflows, 're-run test'),
					{ intervals: [1_000, 2_000, 5_000], timeout: 120_000 },
				)
				.toBeGreaterThan(executionCountAfterFirstRun);
			await expect(n8n.instanceAi.getPreviewNodeSuccessIndicator('re-run test')).toBeVisible({
				timeout: 10_000,
			});
		});
	},
);
