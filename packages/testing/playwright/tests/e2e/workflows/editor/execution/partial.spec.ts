import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Manual partial execution',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should not execute parent nodes with no run data', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('manual-partial-execution.json');
			await n8n.canvas.clickZoomToFitButton();

			await n8n.canvas.openNode('Edit Fields');

			await n8n.ndv.clickExecuteStep();

			await n8n.ndv.close();

			await n8n.canvas.openNode('Webhook1');

			await expect(n8n.ndv.getNodeRunSuccessIndicator()).toBeHidden();
			await expect(n8n.ndv.getNodeRunTooltipIndicator()).toBeHidden();
			await expect(n8n.ndv.outputPanel.getRunSelector()).toBeHidden();
		});

		test('should report a user error, not crash, when the only upstream node is disabled', async ({
			n8n,
		}, testInfo) => {
			const { containerConfig } = testInfo.project.use as {
				containerConfig?: { workers?: number };
			};
			// In queue mode the partial run is handled by a worker, so the UserError never
			// reaches the main-process UI as a toast. Only assert it in direct (main-only) mode.
			test.skip(
				Boolean(containerConfig?.workers),
				'Toast is only shown when the run executes on a main',
			);

			// Pinned Webhook -> Process. A full run gives both nodes run data (from the pinned
			// webhook); disabling the Webhook then leaves Process with no enabled upstream node
			// to start from.
			await n8n.start.fromImportedWorkflow('partial-execution-disabled-pinned-parent.json');
			await n8n.canvas.clickZoomToFitButton();

			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.getNodeSuccessStatusIndicator('Process')).toBeVisible();

			await n8n.canvas.disableNodeFromContextMenu('Webhook');

			await n8n.canvas.openNode('Process');
			await n8n.ndv.clickExecuteStep();

			await expect(
				n8n.notifications
					.getNotificationByContent(/Connect a trigger and make sure it's enabled/)
					.first(),
			).toBeVisible();
		});

		test.describe('partial execution v2', () => {
			test('should execute from the first dirty node up to the current node', async ({ n8n }) => {
				const nodeNames = ['A', 'B', 'C'];

				await n8n.navigate.toWorkflow('new');
				await n8n.partialExecutionComposer.enablePartialExecutionV2();
				await n8n.start.fromImportedWorkflow('Test_workflow_partial_execution_v2.json');
				await n8n.canvas.clickZoomToFitButton();

				await n8n.partialExecutionComposer.executeFullWorkflowAndVerifySuccess(nodeNames);

				const beforeText = await n8n.partialExecutionComposer.captureNodeOutputData('A');

				await n8n.partialExecutionComposer.modifyNodeToTriggerStaleState('B');

				await n8n.partialExecutionComposer.verifyNodeStatesAfterChange(['A', 'C'], ['B']);

				await n8n.partialExecutionComposer.performPartialExecutionAndVerifySuccess('C', nodeNames);

				await n8n.partialExecutionComposer.openNodeForDataVerification('A');

				await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toHaveText(beforeText);
			});
		});
	},
);
