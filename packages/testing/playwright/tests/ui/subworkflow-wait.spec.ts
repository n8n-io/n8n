import { readFileSync } from 'fs';
import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../fixtures/base';
import { resolveFromRoot } from '../../utils/path-helper';
import { retryUntil } from '../../utils/retry-utils';

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

		const response = await api.request.get(`/webhook/${webhookPath}`);
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

		const response = await api.request.get(`/webhook/${webhookPath}`);
		expect(response.ok()).toBe(true);

		// First, wait for the child to finish.
		const childExecution = await api.workflows.waitForExecution(childWorkflowId, 5000);
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
