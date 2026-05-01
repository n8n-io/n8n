import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

test.describe(
	'Instance AI workflow execution @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('should show run workflow button in preview', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "run button visibility test"',
			);

			// New builds route through the planner and pause for user approval.
			await n8n.instanceAi.approveBuildPlan();

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
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger connected to a set node called "full execution test"',
			);

			await n8n.instanceAi.approveBuildPlan();

			// Wait for preview to show canvas nodes
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});

			// Click the run workflow button
			await n8n.instanceAi.getPreviewRunWorkflowButton().click();

			// Nodes should show success indicators after execution completes
			await expect(n8n.instanceAi.getPreviewSuccessIndicators().first()).toBeVisible({
				timeout: 30_000,
			});
		});

		test('should execute individual node from node toolbar', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger connected to a set node called "node execution test"',
			);

			await n8n.instanceAi.approveBuildPlan();

			// Wait for preview to show canvas nodes
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});

			// Hover over the Set node to show its toolbar
			const setNode = n8n.instanceAi.getPreviewNodeByName('node execution test');
			await expect(setNode).toBeVisible({ timeout: 10_000 });
			await setNode.hover();

			// Click the execute node button on the toolbar
			const executeNodeButton = n8n.instanceAi.getPreviewExecuteNodeButton('node execution test');
			await expect(executeNodeButton).toBeVisible({ timeout: 5_000 });
			await executeNodeButton.click();

			// The node should show a success indicator after execution
			await expect(
				n8n.instanceAi.getPreviewNodeSuccessIndicator('node execution test'),
			).toBeVisible({ timeout: 30_000 });
		});

		test('should show execution results in NDV output panel when opening node after execution', async ({
			n8n,
		}) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger connected to a set node called "ndv output test"',
			);

			await n8n.instanceAi.approveBuildPlan();

			// Wait for preview to show canvas nodes
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});

			// Execute the workflow
			await n8n.instanceAi.getPreviewRunWorkflowButton().click();

			// Wait for execution to complete
			await expect(n8n.instanceAi.getPreviewSuccessIndicators().first()).toBeVisible({
				timeout: 30_000,
			});

			// Double-click a node to open NDV
			const setNode = n8n.instanceAi.getPreviewNodeByName('ndv output test');
			await setNode.dblclick();

			// The NDV output panel should be visible with execution data
			await expect(n8n.instanceAi.getPreviewNdvOutputPanel()).toBeVisible({
				timeout: 10_000,
			});
		});

		test('should allow re-running workflow after initial execution', async ({ n8n }, testInfo) => {
			test.skip(
				testInfo.project.name.includes('multi-main'),
				'Re-execution is not yet stable in multi-main mode',
			);
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger connected to a set node called "re-run test"',
			);

			await n8n.instanceAi.approveBuildPlan();

			// Wait for preview to show canvas nodes
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});

			// First execution
			await n8n.instanceAi.getPreviewRunWorkflowButton().click();
			await expect(n8n.instanceAi.getPreviewSuccessIndicators().first()).toBeVisible({
				timeout: 30_000,
			});

			// Run workflow button should still be visible for re-execution
			await expect(n8n.instanceAi.getPreviewRunWorkflowButton()).toBeVisible({
				timeout: 10_000,
			});

			// Second execution — wait for it to actually run and complete so we
			// don't race against stale success indicators from the first run.
			await n8n.instanceAi.getPreviewRunWorkflowButton().click();
			await expect(n8n.instanceAi.getPreviewRunningNodes().first()).toBeVisible({
				timeout: 10_000,
			});
			await expect(n8n.instanceAi.getPreviewRunningNodes()).toHaveCount(0, { timeout: 30_000 });
			await expect(n8n.instanceAi.getPreviewSuccessIndicators().first()).toBeVisible({
				timeout: 10_000,
			});
		});
	},
);
