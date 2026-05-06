/**
 * @file Regression test for GHC-8185
 * @see https://github.com/n8n-io/n8n/issues/29907
 *
 * Bug: When manually re-running an execution with pinned trigger data,
 * the system uses data from a different/random execution instead of
 * the pinned one.
 *
 * User reproduction steps:
 * 1. Execute a workflow multiple times, creating different executions
 * 2. Copy a specific execution to editor by pinning the trigger node data
 * 3. Click "Execute Workflow" button
 * 4. Expected: Uses the pinned trigger data
 * 5. Actual: Uses data from a different/random execution
 */

import { test, expect } from '../../../../../fixtures/base';
import { nanoid } from 'nanoid';

test.describe(
	'Manual execution with pinned trigger data (GHC-8185)',
	{
		annotation: [{ type: 'owner', description: 'CAT' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test('should use pinned trigger data when manually re-running execution', async ({ n8n }) => {
			// Step 1: Create a workflow with a trigger that returns different data each time
			await n8n.canvas.addNode('Schedule Trigger');
			await n8n.ndv.close();

			await n8n.canvas.addNode('Code');
			await n8n.ndv.setParameters({
				mode: 'runOnceForEachItem',
				jsCode: `
					// Pass through the trigger data and add the timestamp
					const triggerData = $input.first().json;
					return {
						...triggerData,
						processedAt: new Date().toISOString()
					};
				`,
			});
			await n8n.ndv.close();

			await n8n.canvas.connectNodes('Schedule Trigger', 'Code');

			// Step 2: Execute the workflow multiple times to create different executions
			// Each execution will have different timestamp from Schedule Trigger

			// Execution 1
			await n8n.canvas.clickExecuteWorkflowButton();
			await n8n.canvas.waitForExecutionToComplete();
			const execution1Timestamp = await n8n.canvas
				.getOpenNode('Schedule Trigger')
				.then(() => n8n.ndv.outputPanel.getTbodyCell(0, 0))
				.then((cell) => cell.textContent());
			await n8n.ndv.close();

			// Wait a bit to ensure different timestamps
			await n8n.canvas.page.waitForTimeout(100);

			// Execution 2
			await n8n.canvas.clickExecuteWorkflowButton();
			await n8n.canvas.waitForExecutionToComplete();
			const execution2Timestamp = await n8n.canvas
				.getOpenNode('Schedule Trigger')
				.then(() => n8n.ndv.outputPanel.getTbodyCell(0, 0))
				.then((cell) => cell.textContent());
			await n8n.ndv.close();

			// Wait a bit
			await n8n.canvas.page.waitForTimeout(100);

			// Execution 3 - This is the one we'll pin
			await n8n.canvas.clickExecuteWorkflowButton();
			await n8n.canvas.waitForExecutionToComplete();

			// Step 3: Open trigger node and pin its data (from execution 3)
			await n8n.canvas.openNode('Schedule Trigger');
			const execution3Timestamp = await n8n.ndv.outputPanel.getTbodyCell(0, 0).textContent();

			// Pin the trigger data
			await n8n.ndv.togglePinData();
			await n8n.ndv.close();

			// Verify we have 3 different timestamps
			expect(execution1Timestamp).not.toBe(execution3Timestamp);
			expect(execution2Timestamp).not.toBe(execution3Timestamp);

			// Step 4: Execute workflow manually - should use pinned data from execution 3
			await n8n.canvas.clickExecuteWorkflowButton();
			await n8n.canvas.waitForExecutionToComplete();

			// Step 5: Verify the Code node received execution 3's data
			await n8n.canvas.openNode('Code');
			const outputAfterPinning = await n8n.ndv.outputPanel.getTbodyCell(0, 0).textContent();

			// The Code node should have received execution 3's timestamp
			// GHC-8185 BUG: This fails because it receives data from execution 1 or 2 instead
			expect(outputAfterPinning).toContain(execution3Timestamp ?? '');
			expect(outputAfterPinning).not.toContain(execution1Timestamp ?? '');
			expect(outputAfterPinning).not.toContain(execution2Timestamp ?? '');
		});

		test('should use pinned webhook trigger data when manually executing', async ({ n8n }) => {
			// This test uses a webhook trigger since the bug report mentions various trigger types

			// Step 1: Create workflow with webhook trigger
			await n8n.canvas.addNode('Webhook');
			await n8n.ndv.close();

			await n8n.canvas.addNode('Code');
			await n8n.ndv.setParameters({
				mode: 'runOnceForEachItem',
				jsCode: `
					return {
						receivedData: $input.first().json,
						marker: 'processed'
					};
				`,
			});
			await n8n.ndv.close();

			await n8n.canvas.connectNodes('Webhook', 'Code');

			// Step 2: Set pinned data on the webhook trigger (simulate execution 5's data)
			await n8n.canvas.openNode('Webhook');
			await n8n.ndv.setPinnedData([
				{
					executionId: 5,
					message: 'Data from execution 5',
					timestamp: '2024-01-05T10:00:00Z',
					uniqueId: nanoid(),
				},
			]);
			await n8n.ndv.close();

			// Step 3: Execute workflow - should use pinned data
			await n8n.canvas.clickExecuteWorkflowButton();
			await n8n.canvas.waitForExecutionToComplete();

			// Step 4: Verify Code node received execution 5's pinned data
			await n8n.canvas.openNode('Code');
			const output = await n8n.ndv.outputPanel.getTbodyCell(0, 0).textContent();

			// Should contain execution 5's data
			expect(output).toContain('executionId');
			expect(output).toContain('5');
			expect(output).toContain('Data from execution 5');
			expect(output).toContain('2024-01-05T10:00:00Z');
		});

		test('should consistently use same pinned trigger data across multiple manual executions', async ({
			n8n,
		}) => {
			// GHC-8185: User reports data is "random" - verify consistency

			// Step 1: Create simple workflow
			await n8n.canvas.addNode('Schedule Trigger');
			await n8n.ndv.close();

			await n8n.canvas.addNode('Code');
			await n8n.ndv.setParameters({
				mode: 'runOnceForEachItem',
				jsCode: 'return $input.first().json;',
			});
			await n8n.ndv.close();

			await n8n.canvas.connectNodes('Schedule Trigger', 'Code');

			// Step 2: Set specific pinned data on trigger
			const uniqueIdentifier = `pinned-${nanoid()}`;
			await n8n.canvas.openNode('Schedule Trigger');
			await n8n.ndv.setPinnedData([
				{
					id: uniqueIdentifier,
					testValue: 'consistent-data',
					executionNumber: 99,
				},
			]);
			await n8n.ndv.close();

			// Step 3: Execute multiple times and verify consistency
			const outputs: string[] = [];

			for (let i = 0; i < 3; i++) {
				await n8n.canvas.clickExecuteWorkflowButton();
				await n8n.canvas.waitForExecutionToComplete();

				await n8n.canvas.openNode('Code');
				const output = await n8n.ndv.outputPanel.getTbodyCell(0, 0).textContent();
				outputs.push(output ?? '');
				await n8n.ndv.close();

				// Small wait between executions
				await n8n.canvas.page.waitForTimeout(100);
			}

			// All executions should use the SAME pinned data
			expect(outputs[0]).toContain(uniqueIdentifier);
			expect(outputs[0]).toContain('consistent-data');
			expect(outputs[0]).toContain('99');

			expect(outputs[1]).toContain(uniqueIdentifier);
			expect(outputs[1]).toContain('consistent-data');
			expect(outputs[2]).toContain(uniqueIdentifier);
			expect(outputs[2]).toContain('consistent-data');

			// GHC-8185 BUG: Without fix, these outputs might be different each time
			expect(outputs[0]).toBe(outputs[1]);
			expect(outputs[1]).toBe(outputs[2]);
		});
	},
);
