import { test, expect } from '../../../fixtures/base';
import { nanoid } from 'nanoid';

/**
 * GHC-7899: Notion node v2.2 with malformed filters shape causes silent redirect to new draft
 *
 * Issue: When a Notion node is created via API with filters using the Notion REST API shape
 * ({"and": [...]}) instead of the n8n-internal shape (filters.conditions[] with key|type keys),
 * the workflow editor refuses to render the workflow. Instead of showing a validation error,
 * it silently redirects to a fresh ?new=true draft, creating orphan empty workflows.
 *
 * Expected: Editor should either:
 * 1. Load the workflow and show a clear validation error on the offending node, OR
 * 2. The create/update API should reject with a structured error
 *
 * Actual: Silent UI redirect with a brief unreadable error flash; orphan empty drafts created.
 *
 * GitHub Issue: https://github.com/n8n-io/n8n/issues/29136
 */
test.describe(
	'GHC-7899 Notion node malformed filters',
	{
		annotation: [{ type: 'owner', description: 'GitHub' }],
	},
	() => {
		test('should handle workflow with malformed Notion filters shape without silent redirect @mode:sqlite', async ({
			n8n,
			api,
		}) => {
			// Create a workflow with a Notion node using the WRONG filters shape
			// (Notion REST API shape instead of n8n internal shape)
			const workflowName = `Notion filter bug ${nanoid()}`;
			const malformedWorkflow = {
				name: workflowName,
				nodes: [
					{
						id: 'cron',
						name: 'Schedule Trigger',
						type: 'n8n-nodes-base.scheduleTrigger',
						typeVersion: 1.3,
						position: [80, 80] as [number, number],
						parameters: {
							rule: {
								interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 6 }],
							},
						},
					},
					{
						id: 'notion',
						name: 'Notion - read',
						type: 'n8n-nodes-base.notion',
						typeVersion: 2.2,
						position: [300, 80] as [number, number],
						parameters: {
							resource: 'databasePage',
							operation: 'getAll',
							databaseId: {
								__rl: true,
								mode: 'id',
								value: 'test-db-id-12345',
							},
							returnAll: true,
							filterType: 'manual',
							// MALFORMED: Using Notion REST API shape instead of n8n internal shape
							filters: {
								and: [
									{
										property: 'Date',
										date: { equals: '={{ $today.toISODate() }}' },
									},
									{
										property: 'Status',
										select: { equals: 'planned' },
									},
								],
							},
						},
					},
				],
				connections: {
					'Schedule Trigger': {
						main: [[{ node: 'Notion - read', type: 'main', index: 0 }]],
					},
				},
				settings: { executionOrder: 'v1' },
			};

			// Create the workflow via API (should succeed - bug is in UI loading)
			const created = await api.workflows.createWorkflow(malformedWorkflow);
			const workflowId = created.id;

			// Navigate to the workflow
			await n8n.navigate.toWorkflow(workflowId);

			// BUG: The editor silently redirects to a new draft instead of showing the workflow
			// Expected: Should either see the workflow with a validation error, or stay on the same URL
			// Actual: URL changes to /workflow/<newId>?new=true

			// Wait a moment for any redirects to happen
			await n8n.page.waitForTimeout(2000);

			// Check if we were redirected away from our workflow
			const currentUrl = n8n.page.url();
			const isOnOriginalWorkflow = currentUrl.includes(`/workflow/${workflowId}`);
			const isOnNewDraft = currentUrl.includes('?new=true');

			// This test documents the CURRENT buggy behavior
			// When the bug is fixed, this test should fail, and then be updated to verify the fix
			if (isOnOriginalWorkflow && !isOnNewDraft) {
				// If we're still on the original workflow, check for validation error
				// This would be the CORRECT behavior
				throw new Error(
					'Test unexpectedly passed: Workflow loaded successfully. ' +
						'This suggests the bug may be fixed. Please verify the node shows a validation error.',
				);
			} else {
				// This is the BUGGY behavior we're documenting
				expect(isOnNewDraft).toBe(true);
				console.log(
					`BUG REPRODUCED: Silently redirected from workflow ${workflowId} to new draft at ${currentUrl}`,
				);
			}
		});

		test('should load workflow with CORRECT Notion filters shape @mode:sqlite', async ({
			n8n,
			api,
		}) => {
			// Create a workflow with a Notion node using the CORRECT filters shape
			const workflowName = `Notion filter correct ${nanoid()}`;
			const correctWorkflow = {
				name: workflowName,
				nodes: [
					{
						id: 'cron',
						name: 'Schedule Trigger',
						type: 'n8n-nodes-base.scheduleTrigger',
						typeVersion: 1.3,
						position: [80, 80] as [number, number],
						parameters: {
							rule: {
								interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 6 }],
							},
						},
					},
					{
						id: 'notion',
						name: 'Notion - read',
						type: 'n8n-nodes-base.notion',
						typeVersion: 2.2,
						position: [300, 80] as [number, number],
						parameters: {
							resource: 'databasePage',
							operation: 'getAll',
							databaseId: {
								__rl: true,
								mode: 'id',
								value: 'test-db-id-12345',
							},
							returnAll: true,
							filterType: 'manual',
							// CORRECT: Using n8n internal shape
							filters: {
								conditions: [
									{
										key: 'Date|date',
										condition: 'equals',
										date: '={{ $today.toISODate() }}',
									},
									{
										key: 'Status|select',
										condition: 'equals',
										selectValue: 'planned',
									},
								],
							},
						},
					},
				],
				connections: {
					'Schedule Trigger': {
						main: [[{ node: 'Notion - read', type: 'main', index: 0 }]],
					},
				},
				settings: { executionOrder: 'v1' },
			};

			// Create the workflow via API
			const created = await api.workflows.createWorkflow(correctWorkflow);
			const workflowId = created.id;

			// Navigate to the workflow
			await n8n.navigate.toWorkflow(workflowId);

			// Wait for canvas to load
			await n8n.canvas.canvasPane().waitFor({ state: 'visible' });

			// Verify we're still on the correct workflow (no redirect)
			const currentUrl = n8n.page.url();
			expect(currentUrl).toContain(`/workflow/${workflowId}`);
			expect(currentUrl).not.toContain('?new=true');

			// Verify the nodes are visible
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		});
	},
);
