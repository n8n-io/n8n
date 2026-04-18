import { test, expect } from '../../../fixtures/base';
import { nanoid } from 'nanoid';

/**
 * GHC-7767: Can't copy to editor previous executions
 *
 * When trying to copy execution data to the editor from the executions list,
 * after confirming "Unpin" for existing pinned data, the trigger node data
 * doesn't actually update. Visually it appears updated, but when executing
 * in test mode, it uses the previously pinned data instead of the new data.
 */
test.describe(
	'GHC-7767 - Copy execution with pinned data',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.api.enableFeature('debugInEditor');
		});

		test('should use new pinned data after copying different execution to editor', async ({
			n8n,
			api,
		}) => {
			// Create a workflow that produces different data on each execution
			const workflowName = `Test Workflow ${nanoid()}`;
			const workflow = await api.workflows.createWorkflow({
				name: workflowName,
				nodes: [
					{
						parameters: {},
						id: nanoid(),
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
					},
					{
						parameters: {
							assignments: {
								assignments: [
									{
										id: nanoid(),
										name: 'randomValue',
										value: '={{ Math.random() }}',
										type: 'number',
									},
								],
							},
							options: {},
						},
						id: nanoid(),
						name: 'Edit Fields',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [450, 300],
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]],
					},
				},
			});

			// Navigate to workflow
			await n8n.navigate.toWorkflow(workflow.id);

			// Execute workflow to create execution 1
			await n8n.canvas.clickExecuteWorkflowButton();
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully');

			// Copy execution 1 to editor
			await n8n.canvas.clickExecutionsTab();
			await n8n.executions.clickLastExecutionItem();
			await n8n.executions.clickCopyToEditorButton();
			await n8n.notifications.waitForNotificationAndClose('Execution data imported');

			// Verify execution 1 data was pinned
			expect(await n8n.canvas.getPinnedNodeNames()).toContain('Manual Trigger');

			// Get the pinned value from execution 1
			await n8n.canvas.openNode('Edit Fields');
			const firstPinnedValue = await n8n.ndv.outputPanel.getTbodyCell(0, 0).textContent();
			await n8n.ndv.close();

			// Execute workflow again to create execution 2 (with different random data)
			await n8n.canvas.clickEditorTab();
			await n8n.canvas.clickExecuteWorkflowButton();
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully');

			// Get execution 2's value before copying to editor
			await n8n.canvas.openNode('Edit Fields');
			const secondExecutionValue = await n8n.ndv.outputPanel.getTbodyCell(0, 0).textContent();
			await n8n.ndv.close();

			// Verify executions have different values
			expect(secondExecutionValue).not.toBe(firstPinnedValue);

			// Copy execution 2 to editor (should replace pinned data)
			await n8n.canvas.clickExecutionsTab();
			await n8n.executions.clickLastExecutionItem();
			await n8n.executions.clickCopyToEditorButton();

			// Confirm unpinning the old data
			await n8n.executions.handlePinnedNodesConfirmation('Unpin');
			await n8n.notifications.waitForNotificationAndClose('Execution data imported');

			// Verify the pinned data was updated (visual check)
			await n8n.canvas.openNode('Edit Fields');
			const newPinnedValue = await n8n.ndv.outputPanel.getTbodyCell(0, 0).textContent();

			// The pinned value should now match execution 2
			expect(newPinnedValue).toBe(secondExecutionValue);
			expect(newPinnedValue).not.toBe(firstPinnedValue);
			await n8n.ndv.close();

			// BUG VERIFICATION: Execute the workflow and verify it uses the NEW pinned data
			// The bug causes it to use the OLD pinned data even though visually it shows new data
			await n8n.canvas.clickEditorTab();
			await n8n.canvas.clickExecuteWorkflowButton();
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully');

			// Check what data was actually used in the execution
			await n8n.canvas.openNode('Edit Fields');
			const executedValue = await n8n.ndv.outputPanel.getTbodyCell(0, 0).textContent();

			// CRITICAL ASSERTION: The executed value should match the NEW pinned data
			// This will FAIL if the bug exists - it will still be using the old pinned data
			expect(executedValue).toBe(newPinnedValue);
			expect(executedValue).toBe(secondExecutionValue);
			expect(executedValue).not.toBe(firstPinnedValue);
		});

		test('should correctly replace pinned trigger data across multiple copy operations', async ({
			n8n,
			api,
		}) => {
			// Create a workflow where the trigger itself has pinnable data
			const workflowName = `Trigger Pin Test ${nanoid()}`;
			const workflow = await api.workflows.createWorkflow({
				name: workflowName,
				nodes: [
					{
						parameters: {},
						id: nanoid(),
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
					},
					{
						parameters: {
							assignments: {
								assignments: [
									{
										id: nanoid(),
										name: 'value',
										value: '={{ Math.random() }}',
										type: 'number',
									},
								],
							},
							options: {},
						},
						id: nanoid(),
						name: 'Set Value',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [450, 300],
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Set Value', type: 'main', index: 0 }]],
					},
				},
			});

			await n8n.navigate.toWorkflow(workflow.id);

			// Create 3 different executions
			const executionValues: string[] = [];

			for (let i = 0; i < 3; i++) {
				await n8n.canvas.clickExecuteWorkflowButton();
				await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully');

				// Store the execution value
				await n8n.canvas.openNode('Set Value');
				const value = await n8n.ndv.outputPanel.getTbodyCell(0, 0).textContent();
				executionValues.push(value!);
				await n8n.ndv.close();
			}

			// Verify we have 3 different values
			expect(new Set(executionValues).size).toBe(3);

			// Copy execution 1 (third in list, oldest) to editor
			await n8n.canvas.clickExecutionsTab();
			const thirdExecution = await n8n.executions.getExecutionItems().nth(2);
			await thirdExecution.click();
			await n8n.executions.clickCopyToEditorButton();
			await n8n.notifications.waitForNotificationAndClose('Execution data imported');

			// Verify execution 1's data is pinned
			await n8n.canvas.openNode('Set Value');
			let pinnedValue = await n8n.ndv.outputPanel.getTbodyCell(0, 0).textContent();
			expect(pinnedValue).toBe(executionValues[0]);
			await n8n.ndv.close();

			// Now copy execution 3 (first in list, newest) - should replace pinned data
			await n8n.canvas.clickExecutionsTab();
			const firstExecution = await n8n.executions.getExecutionItems().first();
			await firstExecution.click();
			await n8n.executions.clickCopyToEditorButton();
			await n8n.executions.handlePinnedNodesConfirmation('Unpin');
			await n8n.notifications.waitForNotificationAndClose('Execution data imported');

			// Verify execution 3's data is now pinned
			await n8n.canvas.openNode('Set Value');
			pinnedValue = await n8n.ndv.outputPanel.getTbodyCell(0, 0).textContent();
			expect(pinnedValue).toBe(executionValues[2]);
			await n8n.ndv.close();

			// Execute and verify it uses execution 3's pinned data
			await n8n.canvas.clickEditorTab();
			await n8n.canvas.clickExecuteWorkflowButton();
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully');

			await n8n.canvas.openNode('Set Value');
			const executedValue = await n8n.ndv.outputPanel.getTbodyCell(0, 0).textContent();

			// Should use execution 3's pinned data, not execution 1's
			expect(executedValue).toBe(executionValues[2]);
			expect(executedValue).not.toBe(executionValues[0]);
			expect(executedValue).not.toBe(executionValues[1]);
		});
	},
);
