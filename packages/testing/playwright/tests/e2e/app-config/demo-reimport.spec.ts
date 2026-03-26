import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';
import simpleWorkflow from '../../../workflows/Manual_wait_set.json';
import chainWorkflow from '../../../workflows/Simple_chain_4nodes.json';

test.describe(
	'Demo reimport',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		const previewRequirements: TestRequirements = {
			config: { settings: { previewMode: true } },
		};

		test.describe('Workflow reimport — connections and layout', () => {
			test.beforeEach(async ({ setupRequirements }) => {
				await setupRequirements(previewRequirements);
			});

			test('should preserve connections when same workflow is reimported', async ({ n8n }) => {
				await n8n.demo.goto();
				await n8n.demo.importWorkflow(simpleWorkflow);
				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
				await expect(n8n.canvas.nodeConnections()).toHaveCount(2);

				// Reimport the same workflow
				await n8n.demo.importWorkflow(simpleWorkflow);
				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
				await expect(n8n.canvas.nodeConnections()).toHaveCount(2);
			});

			test('should show correct connections when switching to a different workflow', async ({
				n8n,
			}) => {
				await n8n.demo.goto();

				// Import 3-node workflow (2 connections)
				await n8n.demo.importWorkflow(simpleWorkflow);
				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
				await expect(n8n.canvas.nodeConnections()).toHaveCount(2);

				// Switch to 4-node workflow (3 connections)
				await n8n.demo.importWorkflow(chainWorkflow);
				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);
				await expect(n8n.canvas.nodeConnections()).toHaveCount(3);
			});

			test('should show all nodes in viewport after reimport (fitView)', async ({ n8n }) => {
				await n8n.demo.goto();
				await n8n.demo.importWorkflow(simpleWorkflow);
				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);

				// Reimport larger workflow
				await n8n.demo.importWorkflow(chainWorkflow);
				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);

				// All nodes should be visible (fitView should have run)
				for (const name of ['Manual', 'Set', 'Wait', 'Set1']) {
					await expect(n8n.canvas.nodeByName(name)).toBeVisible();
				}
			});
		});

		test.describe('Push event simulation — execution status', () => {
			test.beforeEach(async ({ n8n }) => {
				await n8n.demo.goto();
				await n8n.demo.importWorkflow(simpleWorkflow);
				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
			});

			test('should show running status on node during execution', async ({ n8n }) => {
				await n8n.demo.dispatchPushEvent({
					type: 'executionStarted',
					data: { executionId: 'test-exec-1' },
				});

				await n8n.demo.dispatchPushEvent({
					type: 'nodeExecuteBefore',
					data: { executionId: 'test-exec-1', nodeName: 'Wait' },
				});

				await expect(n8n.canvas.getNodeRunningStatusIndicator('Wait')).toBeVisible();
			});

			test('should show success status after node completes', async ({ n8n }) => {
				await n8n.demo.dispatchPushEvent({
					type: 'executionStarted',
					data: { executionId: 'test-exec-1' },
				});

				await n8n.demo.dispatchPushEvent({
					type: 'nodeExecuteBefore',
					data: { executionId: 'test-exec-1', nodeName: 'Wait' },
				});

				await n8n.demo.dispatchPushEvent({
					type: 'nodeExecuteAfter',
					data: {
						executionId: 'test-exec-1',
						nodeName: 'Wait',
						data: { executionTime: 50, startTime: Date.now(), executionIndex: 0, source: [] },
						itemCountByConnectionType: { main: [1] },
					},
				});

				await expect(n8n.canvas.getNodeSuccessStatusIndicator('Wait')).toBeVisible();
			});

			test('should clear stale execution state on re-execution', async ({ n8n }) => {
				// First execution — Wait succeeds
				await n8n.demo.dispatchPushEvent({
					type: 'executionStarted',
					data: { executionId: 'exec-1' },
				});
				await n8n.demo.dispatchPushEvent({
					type: 'nodeExecuteBefore',
					data: { executionId: 'exec-1', nodeName: 'Wait' },
				});
				await n8n.demo.dispatchPushEvent({
					type: 'nodeExecuteAfter',
					data: {
						executionId: 'exec-1',
						nodeName: 'Wait',
						data: { executionTime: 50, startTime: Date.now(), executionIndex: 0, source: [] },
						itemCountByConnectionType: { main: [1] },
					},
				});
				await expect(n8n.canvas.getNodeSuccessStatusIndicator('Wait')).toBeVisible();

				// Second execution starts — stale success should clear
				await n8n.demo.dispatchPushEvent({
					type: 'executionStarted',
					data: { executionId: 'exec-2' },
				});

				// Wait is not yet executing in exec-2, so it should not show success from exec-1
				await expect(n8n.canvas.getNodeSuccessStatusIndicator('Wait')).toBeHidden();
			});

			test('should show logs panel during execution', async ({ n8n }) => {
				const logsPanel = n8n.page.getByTestId('logs-panel');
				await expect(logsPanel).toBeHidden();

				await n8n.demo.dispatchPushEvent({
					type: 'executionStarted',
					data: { executionId: 'test-exec-1' },
				});

				await expect(logsPanel).toBeVisible();
			});
		});
	},
);
