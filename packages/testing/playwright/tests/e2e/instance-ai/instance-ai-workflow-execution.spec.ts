import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI workflow execution @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test.describe.configure({ timeout: 180_000 });

		test.beforeEach(({}, testInfo) => {
			test.skip(
				testInfo.project.name.includes('multi-main'),
				'Workflow execution replay is not yet stable in multi-main mode',
			);
		});

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
			test.setTimeout(180_000);

			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with the "When clicking Test workflow" trigger connected to a set node called "full execution test". Use the trigger that runs from the editor Test workflow button.',
			);

			await n8n.instanceAi.approveBuildPlan();

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

			await n8n.instanceAi.approveBuildPlan();

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

			await n8n.instanceAi.approveBuildPlan();

			// Wait for preview to show canvas nodes
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});

			// First execution
			await n8n.instanceAi.runPreviewWorkflow();
			await expect(n8n.instanceAi.getPreviewSuccessIndicators().first()).toBeVisible({
				timeout: 30_000,
			});
			await n8n.notifications.closeNotificationByText('Workflow executed successfully', {
				timeout: 10_000,
			});
			await expect(
				n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
			).toHaveCount(0, { timeout: 10_000 });

			// Run workflow button should still be visible for re-execution
			await expect(n8n.instanceAi.getPreviewRunWorkflowButton()).toBeVisible({
				timeout: 10_000,
			});

			// Second execution — wait for a fresh success notification so fast
			// workflows do not race through the transient running-node class.
			await n8n.instanceAi.runPreviewWorkflow();
			await expect(
				n8n.notifications.getNotificationByTitle('Workflow executed successfully').first(),
			).toBeVisible({ timeout: 30_000 });
			await expect(n8n.instanceAi.getPreviewSuccessIndicators().first()).toBeVisible({
				timeout: 10_000,
			});
		});
	},
);
