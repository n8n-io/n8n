import { test, expect } from '../../../fixtures/base';

/**
 * GHC-7914: Wait node hangs indefinitely instead of resuming after interval time
 *
 * User reports that Wait nodes configured with time intervals (e.g., 2 minutes)
 * hang indefinitely in "waiting" state instead of automatically resuming after
 * the configured time period. The workflow is triggered via webhook and should
 * complete ~2 minutes after triggering, but instead remains stuck.
 *
 * Reproduction workflow:
 * Webhook Trigger -> Wait (2 minutes) -> Set Node
 *
 * Expected behavior:
 * - Workflow reaches "waiting" state immediately after Wait node starts
 * - Workflow automatically resumes and completes ~2 minutes later
 *
 * Actual behavior (bug):
 * - Workflow reaches "waiting" state
 * - Workflow never resumes, hangs indefinitely
 *
 * See: https://github.com/n8n-io/n8n/issues/29160
 */
test.describe('GHC-7914: Wait Node Time Interval Resume', () => {
	test('should resume after 2 minute wait interval and complete workflow', async ({ api }) => {
		// Import workflow with Webhook -> Wait (2 min) -> Set
		const { webhookPath, workflowId, createdWorkflow } =
			await api.workflows.importWorkflowFromFile('ghc-7914-wait-hang.json');

		// Activate workflow so webhook trigger works
		await api.workflows.activate(workflowId, createdWorkflow.versionId!);

		// Record start time to verify wait duration
		const startTime = Date.now();

		// Trigger workflow via webhook
		const triggerResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
			method: 'POST',
			data: { testData: 'ghc-7914' },
		});
		expect(triggerResponse.ok()).toBe(true);

		// Wait for workflow to reach "waiting" state
		// This should happen almost immediately after the Wait node starts executing
		const waitingExecution = await api.workflows.waitForWorkflowStatus(workflowId, 'waiting');
		expect(waitingExecution).toBeDefined();
		expect(waitingExecution.status).toBe('waiting');

		// Now wait for the workflow to complete
		// Wait node is configured for 2 minutes (120 seconds)
		// We allow 150 seconds (2.5 minutes) for completion to account for processing time
		const completedExecution = await api.workflows.waitForExecution(workflowId, 150_000);

		// Verify execution completed successfully
		expect(completedExecution.status).toBe('success');
		expect(completedExecution.id).toBe(waitingExecution.id);

		// Verify the wait duration was approximately 2 minutes
		const elapsedTime = Date.now() - startTime;
		const twoMinutesMs = 120_000;
		const toleranceMs = 30_000; // Allow 30 second tolerance for processing overhead

		expect(elapsedTime).toBeGreaterThanOrEqual(twoMinutesMs - toleranceMs);
		expect(elapsedTime).toBeLessThan(twoMinutesMs + toleranceMs);

		// Verify the Set node executed (confirming workflow completed past Wait node)
		const fullExecution = await api.workflows.getExecution(completedExecution.id);
		expect(fullExecution.data).toBeDefined();

		// Parse execution data to verify Set node ran
		const executionData = JSON.parse(fullExecution.data);
		expect(executionData.resultData.runData).toHaveProperty('Set Completion Flag');
		expect(executionData.resultData.runData['Set Completion Flag']).toBeDefined();
	});

	test('should resume after 90 second wait interval', async ({ api }) => {
		// Test with 90 seconds (1.5 minutes) to ensure issue is not specific to 2 minutes
		// This is above the 65 second threshold where Wait node uses putExecutionToWait()
		const workflow = {
			name: 'GHC-7914 Wait 90s Test',
			nodes: [
				{
					parameters: {
						path: 'ghc-7914-test-90s',
						options: {},
					},
					id: 'webhook-90s',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [240, 300],
					webhookId: 'ghc-7914-webhook-90s',
				},
				{
					parameters: {
						amount: 90,
						unit: 'seconds',
					},
					id: 'wait-90s',
					name: 'Wait 90s',
					type: 'n8n-nodes-base.wait',
					typeVersion: 1.1,
					position: [460, 300],
					webhookId: 'wait-90s-webhook',
				},
				{
					parameters: {
						mode: 'manual',
						duplicateItem: false,
						assignments: {
							assignments: [
								{
									id: 'completed',
									name: 'completed',
									value: true,
									type: 'boolean',
								},
							],
						},
						options: {},
					},
					id: 'set-90s',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [680, 300],
				},
			],
			connections: {
				Webhook: {
					main: [
						[
							{
								node: 'Wait 90s',
								type: 'main',
								index: 0,
							},
						],
					],
				},
				'Wait 90s': {
					main: [
						[
							{
								node: 'Set',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
			active: false,
			settings: {
				executionOrder: 'v1',
			},
			pinData: {},
			meta: {
				instanceId: 'ghc-7914-90s-test',
			},
			tags: [],
		};

		const { workflowId, createdWorkflow } =
			await api.workflows.importWorkflowFromDefinition(workflow);

		await api.workflows.activate(workflowId, createdWorkflow.versionId!);

		const startTime = Date.now();

		const triggerResponse = await api.webhooks.trigger('/webhook/ghc-7914-test-90s', {
			method: 'POST',
		});
		expect(triggerResponse.ok()).toBe(true);

		const waitingExecution = await api.workflows.waitForWorkflowStatus(workflowId, 'waiting');
		expect(waitingExecution.status).toBe('waiting');

		// Allow 120 seconds (2 minutes) for 90 second wait to complete
		const completedExecution = await api.workflows.waitForExecution(workflowId, 120_000);

		expect(completedExecution.status).toBe('success');

		const elapsedTime = Date.now() - startTime;
		expect(elapsedTime).toBeGreaterThanOrEqual(85_000); // 90s - 5s tolerance
		expect(elapsedTime).toBeLessThan(120_000); // Should complete well before 2 minutes
	});
});
