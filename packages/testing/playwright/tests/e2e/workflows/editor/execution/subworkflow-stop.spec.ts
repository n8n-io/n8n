import { nanoid } from 'nanoid';

import { test, expect } from '../../../../../fixtures/base';
import type { INodeParameterResourceLocator } from 'n8n-workflow';

/**
 * E2E tests for stopping subworkflow executions in queue mode.
 *
 * Reproduces GHC-6865: Subworkflow executions cannot be stopped in queue mode.
 * When a subworkflow is stopped via the API, the status is set to 'canceled',
 * but the execution continues running on the worker and eventually overwrites
 * the status to 'success' when it completes.
 */

function assertResourceLocator(
	param: unknown,
): asserts param is INodeParameterResourceLocator {
	if (
		typeof param !== 'object' ||
		param === null ||
		!('__rl' in param) ||
		!('value' in param)
	) {
		throw new Error('Expected INodeParameterResourceLocator');
	}
}

test.describe(
	'Subworkflow Stop @mode:queue',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should prevent subworkflow status from being overwritten to success after stop @flaky', async ({
			api,
		}) => {
			// Step 1: Create child subworkflow with long-running HTTP requests
			const { workflowId: childWorkflowId, createdWorkflow: childWorkflow } =
				await api.workflows.importWorkflowFromFile('ghc-6865-child-subworkflow.json');

			await api.workflows.activate(childWorkflowId, childWorkflow.versionId!);

			// Step 2: Create parent workflow and link it to the child
			const { webhookPath, workflowId: parentWorkflowId, createdWorkflow: parentWorkflow } =
				await api.workflows.importWorkflowFromFile('ghc-6865-parent-workflow.json', {
					transform: (workflow) => {
						// Update the Execute Workflow node to reference the child workflow
						const executeWorkflowNode = workflow.nodes?.find(
							(n) => n.type === 'n8n-nodes-base.executeWorkflow',
						);
						if (executeWorkflowNode?.parameters.workflowId) {
							const workflowIdParam = executeWorkflowNode.parameters.workflowId;
							assertResourceLocator(workflowIdParam);
							workflowIdParam.value = childWorkflowId;
						}
						return workflow;
					},
				});

			await api.workflows.activate(parentWorkflowId, parentWorkflow.versionId!);

			// Step 3: Trigger the parent workflow via webhook (queues execution on worker)
			const webhookTriggerPromise = api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: { test: 'data' },
			});

			// Step 4: Wait for the subworkflow execution to start
			// The parent execution starts immediately, but the child takes a moment
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Get the child execution (most recent execution)
			const executions = await api.workflows.getExecutions(childWorkflowId, 10);
			const childExecution = executions.find(
				(e) => e.workflowId === childWorkflowId && e.status === 'running',
			);

			// If no running execution found, fail with helpful message
			if (!childExecution) {
				const allStatuses = executions.map((e) => ({ id: e.id, status: e.status }));
				throw new Error(
					`Expected to find running child execution, but found: ${JSON.stringify(allStatuses)}`,
				);
			}

			// Step 5: Stop the subworkflow execution via API
			const stopResponse = await api.request.post(`/rest/executions/${childExecution.id}/stop`);
			expect(stopResponse.ok()).toBe(true);

			// Verify the execution was marked as canceled
			const stoppedExecution = await api.workflows.getExecution(childExecution.id);
			expect(stoppedExecution.status).toBe('canceled');

			// Step 6: Wait for the worker to finish (it should respect the stop signal)
			// If the bug exists, the worker will continue and overwrite status to 'success'
			await new Promise((resolve) => setTimeout(resolve, 10000));

			// Step 7: Verify the status is still 'canceled' (not overwritten to 'success')
			const finalExecution = await api.workflows.getExecution(childExecution.id);

			// THIS IS THE BUG: In queue mode, the worker ignores the stop signal
			// and overwrites the 'canceled' status to 'success' when it completes
			expect(finalExecution.status).toBe('canceled');

			// Wait for webhook to complete (or timeout)
			try {
				await webhookTriggerPromise;
			} catch (error) {
				// Parent execution may fail since child was stopped, which is expected
			}
		});

		test('should actually stop subworkflow execution on the worker @flaky', async ({ api }) => {
			// Step 1: Create child subworkflow with long-running HTTP requests
			const { workflowId: childWorkflowId, createdWorkflow: childWorkflow } =
				await api.workflows.importWorkflowFromFile('ghc-6865-child-subworkflow.json');

			await api.workflows.activate(childWorkflowId, childWorkflow.versionId!);

			// Step 2: Create parent workflow and link it to the child
			const { webhookPath, workflowId: parentWorkflowId, createdWorkflow: parentWorkflow } =
				await api.workflows.importWorkflowFromFile('ghc-6865-parent-workflow.json', {
					transform: (workflow) => {
						const executeWorkflowNode = workflow.nodes?.find(
							(n) => n.type === 'n8n-nodes-base.executeWorkflow',
						);
						if (executeWorkflowNode?.parameters.workflowId) {
							const workflowIdParam = executeWorkflowNode.parameters.workflowId;
							assertResourceLocator(workflowIdParam);
							workflowIdParam.value = childWorkflowId;
						}
						return workflow;
					},
				});

			await api.workflows.activate(parentWorkflowId, parentWorkflow.versionId!);

			// Step 3: Trigger the parent workflow
			const triggerTime = Date.now();
			const webhookTriggerPromise = api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: { test: 'data' },
			});

			// Step 4: Wait for subworkflow to start
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Get the running child execution
			const executions = await api.workflows.getExecutions(childWorkflowId, 10);
			const childExecution = executions.find(
				(e) => e.workflowId === childWorkflowId && e.status === 'running',
			);

			if (!childExecution) {
				throw new Error('Expected to find running child execution');
			}

			const stopTime = Date.now();

			// Step 5: Stop the subworkflow
			await api.request.post(`/rest/executions/${childExecution.id}/stop`);

			// Step 6: Wait briefly, then check execution details
			await new Promise((resolve) => setTimeout(resolve, 2000));

			const finalExecution = await api.workflows.getExecution(childExecution.id);
			const endTime = Date.now();

			// Calculate actual execution time
			const executionStartTime = new Date(
				finalExecution.startedAt ?? finalExecution.createdAt ?? triggerTime,
			).getTime();
			const executionEndTime = finalExecution.stoppedAt
				? new Date(finalExecution.stoppedAt).getTime()
				: endTime;
			const actualExecutionTime = executionEndTime - executionStartTime;

			// Expected execution time if all 3 HTTP delays (3s each) completed: ~9+ seconds
			// Expected execution time if stopped after ~2s: ~2-4 seconds
			// If the bug exists, actualExecutionTime will be ~9+ seconds (all nodes executed)
			// If fixed, actualExecutionTime should be ~2-4 seconds (stopped early)

			// THIS IS THE BUG: The worker doesn't actually stop the execution
			// It continues executing all nodes even after the stop signal
			expect(actualExecutionTime).toBeLessThan(6000); // Should stop within ~4s, not complete all ~9s

			// Cleanup
			try {
				await webhookTriggerPromise;
			} catch (error) {
				// Expected to fail
			}
		});
	},
);
