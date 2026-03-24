import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * GHC-7309: Regression test for webhook "Copy to editor" functionality
 *
 * In 2.9.x and earlier, users could:
 * 1. Open a previous webhook execution from Executions
 * 2. Click "Copy to editor"
 * 3. Click "Execute workflow" to replay the execution using the copied webhook data
 *
 * In 2.11.x, step 3 no longer works - the workflow doesn't execute with the pinned webhook data.
 *
 * Expected behavior: After "Copy to editor", the workflow should be executable
 * directly from the editor using the copied webhook trigger data.
 */
test.describe(
	'GHC-7309: Webhook Copy to Editor Regression',
	{
		annotation: [{ type: 'issue', description: 'GHC-7309' }],
	},
	() => {
		test('should execute workflow with pinned webhook data after Copy to Editor', async ({
			n8n,
			api,
		}) => {
			// Create a webhook workflow
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode('Webhook');

			// Configure webhook
			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'POST',
			});
			const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();
			await n8n.ndv.close();

			// Add a Set node to process the webhook data
			await n8n.canvas.addNode('Edit Fields (Set)');
			await n8n.ndv.fillParameterInput('assignments.assignments[0].name', 'processed');
			await n8n.ndv.fillParameterInput(
				'assignments.assignments[0].value',
				'=Processed: {{ $json.body }}',
			);
			await n8n.ndv.close();

			// Save workflow and get workflow ID
			const saveResponse = await n8n.canvas.waitForSaveWorkflowCompleted();
			const workflowData = await saveResponse.json();
			const workflowId = workflowData.id;
			const versionId = workflowData.versionId;

			// Activate the workflow
			await api.workflows.activate(workflowId, versionId);

			// Trigger the webhook with test data
			const testPayload = { test: 'data', value: nanoid() };
			const response = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: testPayload,
			});
			expect(response.ok()).toBe(true);

			// Wait for execution to complete
			await n8n.page.waitForTimeout(1000);

			// Go to Executions page
			await n8n.canvas.clickExecutionsTab();

			// Wait for execution to appear
			await expect(n8n.executions.getExecutionItems()).toHaveCount(1, { timeout: 5000 });

			// Open the execution
			await n8n.executions.clickLastExecutionItem();

			// Click "Copy to editor"
			await n8n.executions.clickCopyToEditorButton();

			// Verify we're in debug mode
			await expect(n8n.page).toHaveURL(/\/debug/);

			// Verify the webhook node has pinned data
			await n8n.canvas.openNode('Webhook');
			await expect(n8n.ndv.outputPanel.getTableRows()).toHaveCount(2); // header + 1 data row
			await expect(n8n.ndv.outputPanel.get()).toContainText(testPayload.value);
			await n8n.ndv.close();

			// Clear any existing execution data to ensure we're testing pinned data execution
			await expect(n8n.canvas.clearExecutionDataButton()).toBeVisible();
			await n8n.canvas.clearExecutionData();

			// CRITICAL TEST: Execute workflow using the pinned webhook data
			// This should work by clicking "Execute workflow" button
			await n8n.canvas.clickExecuteWorkflowButton();

			// Wait for execution to complete
			await n8n.notifications.waitForNotification('Workflow executed successfully', {
				timeout: 10000,
			});

			// Verify the workflow executed with the pinned data
			await n8n.canvas.openNode('Edit Fields');
			await expect(n8n.ndv.outputPanel.get()).toContainText('Processed:');
			await expect(n8n.ndv.outputPanel.get()).toContainText(testPayload.value);
		});

		test('should execute webhook workflow when webhook node has pinned data from Copy to Editor', async ({
			n8n,
			api,
		}) => {
			// Similar test but focuses on the core issue: can we execute after Copy to Editor?
			await n8n.start.fromBlankCanvas();

			// Create simple webhook + code workflow
			await n8n.canvas.addNode('Webhook');
			await n8n.ndv.setupHelper.webhook({
				httpMethod: 'GET',
			});
			const webhookPath = await n8n.ndv.setupHelper.getWebhookPath();
			await n8n.ndv.close();

			// Add Code node to verify execution
			await n8n.canvas.addNode('Code');
			await n8n.ndv.fillParameterInput(
				'jsCode',
				'return [{ executed: true, time: new Date().toISOString() }];',
			);
			await n8n.ndv.close();

			// Save workflow and get workflow ID
			const saveResponse = await n8n.canvas.waitForSaveWorkflowCompleted();
			const workflowData = await saveResponse.json();
			const workflowId = workflowData.id;
			const versionId = workflowData.versionId;

			// Activate and trigger
			await api.workflows.activate(workflowId, versionId);
			const triggerId = nanoid();
			const triggerResponse = await api.webhooks.trigger(
				`/webhook/${webhookPath}?trigger_id=${triggerId}`,
			);
			expect(triggerResponse.ok()).toBe(true);

			// Wait for execution
			await n8n.page.waitForTimeout(1000);

			// Copy to editor
			await n8n.canvas.clickExecutionsTab();
			await expect(n8n.executions.getExecutionItems()).toHaveCount(1, { timeout: 5000 });
			await n8n.executions.clickLastExecutionItem();
			await n8n.executions.clickCopyToEditorButton();

			// Verify in debug mode with pinned data
			await expect(n8n.page).toHaveURL(/\/debug/);
			await n8n.canvas.openNode('Webhook');
			await expect(n8n.ndv.outputPanel.get()).toContainText(triggerId);
			await n8n.ndv.close();

			// Execute workflow button should work with pinned data
			await n8n.canvas.clickExecuteWorkflowButton();

			// Should execute successfully
			await n8n.notifications.waitForNotification('Workflow executed successfully', {
				timeout: 10000,
			});

			// Verify Code node executed (proves the workflow ran)
			await n8n.canvas.openNode('Code');
			await expect(n8n.ndv.outputPanel.get()).toContainText('executed');
			await expect(n8n.ndv.outputPanel.get()).toContainText('true');
		});
	},
);
