import flatted from 'flatted';
import { readFileSync } from 'fs';
import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../../../../fixtures/base';
import { resolveFromRoot } from '../../../../../utils/path-helper';
import { retryUntil } from '../../../../../utils/retry-utils';

test.describe('Parent that does not wait for sub-workflow', () => {
	test('should not wait for the sub-workflow', async ({ api }) => {
		const childWorkflowId = (
			await api.workflows.importWorkflowFromFile('subworkflow-wait-child.json')
		).workflowId;

		const filePath = resolveFromRoot('workflows', 'subworkflow-parent-no-wait.json');
		const fileContent = readFileSync(filePath, 'utf8');
		const workflowDefinition = JSON.parse(fileContent) as IWorkflowBase;
		expect(workflowDefinition?.nodes[0]?.parameters).toBeDefined();
		// Replace the placeholder workflow ID with the actual child workflow ID
		workflowDefinition.nodes[0].parameters.workflowId = {
			value: childWorkflowId,
			mode: 'list',
		};
		const { webhookPath, workflowId } =
			await api.workflows.importWorkflowFromDefinition(workflowDefinition);

		const response = await api.webhooks.trigger(`/webhook/${webhookPath}`);
		expect(response.ok()).toBe(true);
		const execution = await api.workflows.waitForExecution(workflowId, 5000);
		expect(execution.status).toBe('success');

		// The child workflow should still be running or waiting, since it's configured to wait 120s.
		const getExecutionsResponse = await api.workflows.getExecutions(childWorkflowId);
		// TODO: figure out why the filtering in `getExecutions` isn't working.
		const childExecutions = getExecutionsResponse.filter((e) => e.workflowId === childWorkflowId);
		expect(childExecutions.length).toBe(1);
		expect(childExecutions[0].status).toMatch(/running|waiting/);
	});

	test('CAT-1445 should not be restarted by the child workflow finishing', async ({ api }) => {
		// The child is a no-op that returns immediately.
		const childWorkflowId = (
			await api.workflows.importWorkflowFromFile('subworkflow-noop-child.json')
		).workflowId;

		// This is a parent that does NOT wait for the child to finish, but it has its own separate Wait node.
		// We want to verify that the parent is NOT restarted when the child finishes. This was fixed in CAT-1445.
		const filePath = resolveFromRoot('workflows', 'subworkflow-waiting-parent-no-child-wait.json');
		const fileContent = readFileSync(filePath, 'utf8');
		const workflowDefinition = JSON.parse(fileContent) as IWorkflowBase;
		expect(workflowDefinition?.nodes[1]?.parameters).toBeDefined();
		// Replace the placeholder workflow ID with the actual child workflow ID
		workflowDefinition.nodes[1].parameters.workflowId = {
			value: childWorkflowId,
			mode: 'list',
		};
		const { webhookPath, workflowId } =
			await api.workflows.importWorkflowFromDefinition(workflowDefinition);

		const response = await api.webhooks.trigger(`/webhook/${webhookPath}`);
		expect(response.ok()).toBe(true);

		// First, wait for the child to finish.
		const childExecution = await api.workflows.waitForExecution(childWorkflowId, 10000);
		expect(childExecution.status).toBe('success');

		// Verify that the parent didn't get resumed. We might need to give it a moment to reach the waiting state.
		await retryUntil(
			async () => {
				const getExecutionsResponse = await api.workflows.getExecutions(workflowId);
				// TODO: figure out why the filtering in `getExecutions` isn't working.
				const parentExecutions = getExecutionsResponse.filter((e) => e.workflowId === workflowId);
				expect(parentExecutions.length).toBe(1);
				expect(parentExecutions[0].status).toBe('waiting');
			},
			{ timeoutMs: 2000, intervalMs: 100 },
		);
	});
});

test.describe('CAT-1801: Parent receives correct data from child with wait node', () => {
	test('should return child final output to parent after wait completes', async ({ api }) => {
		// Import child workflow (has Wait node with webhook)
		const { workflowId: childWorkflowId } =
			await api.workflows.importWorkflowFromFile('cat-1801-child.json');

		// Import parent workflow and link to child
		const parentFilePath = resolveFromRoot('workflows', 'cat-1801-parent.json');
		const parentContent = readFileSync(parentFilePath, 'utf8');
		const parentDefinition = JSON.parse(parentContent) as IWorkflowBase;

		// Update Execute Workflow node to reference the child
		const executeWorkflowNode = parentDefinition.nodes.find(
			(n) => n.type === 'n8n-nodes-base.executeWorkflow',
		)!;
		executeWorkflowNode.parameters.workflowId = { value: childWorkflowId, mode: 'list' };

		const {
			webhookPath,
			workflowId: parentWorkflowId,
			createdWorkflow: { versionId },
		} = await api.workflows.importWorkflowFromDefinition(parentDefinition);

		// Activate parent workflow so webhook works
		await api.workflows.activate(parentWorkflowId, versionId!);

		// Trigger parent workflow via webhook
		const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`);
		expect(webhookResponse.ok()).toBe(true);

		// Wait for child execution to appear and enter waiting state
		let childExecution;
		await retryUntil(
			async () => {
				const childExecutions = await api.workflows.getExecutions(childWorkflowId);
				childExecution = childExecutions.find((e) => e.status === 'waiting');
				expect(childExecution).toBeDefined();
			},
			{ timeoutMs: 10000, intervalMs: 200 },
		);

		// Trigger the wait webhook to resume child using child execution ID
		const waitWebhookResponse = await api.webhooks.trigger(
			`/webhook-waiting/${childExecution!.id}`,
		);
		expect(waitWebhookResponse.ok()).toBe(true);

		// Wait for parent to complete
		const parentExecution = await api.workflows.waitForExecution(parentWorkflowId, 15000);
		expect(parentExecution.status).toBe('success');

		// Get full parent execution data
		const fullParentExecution = await api.workflows.getExecution(parentExecution.id);
		const executionData = flatted.parse(fullParentExecution.data);

		// Verify Execute Workflow node received child's FINAL output (after wait)
		// Should be 'child - after', NOT 'child - before' or parent input
		const executeWorkflowOutput = executionData.resultData.runData['Execute Workflow'];
		expect(executeWorkflowOutput).toBeDefined();
		expect(executeWorkflowOutput[0].data.main[0][0].json.type).toBe('child - after');
	});
});

test.describe('CAT-1929: Parent should not resume until child with multiple waits completes', () => {
	test('should keep parent waiting after first wait node is resumed, only completing after second wait', async ({
		api,
	}) => {
		// Import child workflow with two Wait nodes (auto-activated via "active": true in JSON)
		const { workflowId: childWorkflowId } = await api.workflows.importWorkflowFromFile(
			'cat-1929-child-two-waits.json',
		);

		// Import parent workflow and link to child
		const parentFilePath = resolveFromRoot('workflows', 'cat-1929-parent.json');
		const parentContent = readFileSync(parentFilePath, 'utf8');
		const parentDefinition = JSON.parse(parentContent) as IWorkflowBase;

		// Update Execute Workflow node to reference the child
		const executeWorkflowNode = parentDefinition.nodes.find(
			(n) => n.type === 'n8n-nodes-base.executeWorkflow',
		)!;
		executeWorkflowNode.parameters.workflowId = { value: childWorkflowId, mode: 'list' };

		const {
			webhookPath,
			workflowId: parentWorkflowId,
			createdWorkflow: { versionId },
		} = await api.workflows.importWorkflowFromDefinition(parentDefinition);

		// Activate parent workflow so webhook works
		await api.workflows.activate(parentWorkflowId, versionId!);

		// Trigger parent workflow via webhook
		const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`);
		expect(webhookResponse.ok()).toBe(true);

		// Wait for child execution to appear and enter waiting state (first wait node)
		const childExecution = await api.workflows.waitForWorkflowStatus(childWorkflowId, 'waiting');

		// Verify parent is also waiting at this point
		await api.workflows.waitForWorkflowStatus(parentWorkflowId, 'waiting');

		// Resume first wait node
		const firstWaitResponse = await api.webhooks.trigger(`/webhook-waiting/${childExecution.id}`);
		expect(firstWaitResponse.ok()).toBe(true);

		// Wait for child to reach the second wait node
		await api.workflows.waitForWorkflowStatus(childWorkflowId, 'waiting');

		// Verify parent is STILL waiting (not resumed after first wait completed)
		const parentExecAfterFirstWait = await api.workflows.waitForWorkflowStatus(
			parentWorkflowId,
			'waiting',
		);
		expect(parentExecAfterFirstWait.status).toBe('waiting');

		// Resume second wait node
		const secondWaitResponse = await api.webhooks.trigger(`/webhook-waiting/${childExecution.id}`);
		expect(secondWaitResponse.ok()).toBe(true);

		// Now parent should complete
		const parentExecution = await api.workflows.waitForExecution(parentWorkflowId, 15000);
		expect(parentExecution.status).toBe('success');

		// Verify child also completed
		const finalChildExecution = await api.workflows.getExecution(childExecution.id);
		expect(finalChildExecution.status).toBe('success');

		// Verify Execute Workflow node received child's FINAL output (after both waits)
		await retryUntil(async () => {
			// Get full parent execution data and verify it received the final child output
			const fullParentExecution = await api.workflows.getExecution(parentExecution.id);
			const executionData = flatted.parse(fullParentExecution.data);
			const executeWorkflowOutput = executionData.resultData.runData['Execute Workflow'];
			expect(executeWorkflowOutput).toBeDefined();
			expect(executeWorkflowOutput[0].data.main[0][0].json.stage).toBe('completed');
		});
	});
});
