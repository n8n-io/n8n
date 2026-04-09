import { readFileSync } from 'fs';
import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../../../../fixtures/base';
import { resolveFromRoot } from '../../../../../utils/path-helper';
import { retryUntil } from '../../../../../utils/retry-utils';

test.describe(
	'GHC-7645: Execute Workflow with multiple items',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should complete parent workflow after all sub-workflows finish when using "run once for each item" mode', async ({
			api,
		}) => {
			// Create a simple sub-workflow that just passes through the input
			const { workflowId: childWorkflowId } = await api.workflows.createWorkflowFromDefinition({
				name: 'Sub-workflow - Simple Passthrough',
				nodes: [
					{
						parameters: {
							inputSource: 'passthrough',
						},
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						typeVersion: 1.1,
						position: [0, 0],
						id: 'execute-workflow-trigger',
						name: 'When Executed by Another Workflow',
					},
					{
						parameters: {
							assignments: {
								assignments: [
									{
										id: 'result-field',
										name: 'result',
										value: 'processed',
										type: 'string',
									},
								],
							},
							options: {},
						},
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [200, 0],
						id: 'set-result',
						name: 'Set Result',
					},
				],
				connections: {
					'When Executed by Another Workflow': {
						main: [
							[
								{
									node: 'Set Result',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
				active: false,
				pinData: {},
			});

			// Create parent workflow with multiple items
			const { webhookPath, workflowId: parentWorkflowId } =
				await api.workflows.createWorkflowFromDefinition({
					name: 'Parent Workflow - Multiple Items',
					nodes: [
						{
							parameters: {
								path: 'test-webhook',
								responseMode: 'lastNode',
								options: {},
							},
							type: 'n8n-nodes-base.webhook',
							typeVersion: 2.1,
							position: [0, 0],
							id: 'webhook-trigger',
							name: 'Webhook',
							webhookId: 'test-webhook-id',
						},
						{
							parameters: {
								mode: 'manual',
								duplicateItem: false,
								assignments: {
									assignments: [
										{
											id: 'item-field',
											name: 'itemId',
											value: '={{ $itemIndex }}',
											type: 'number',
										},
									],
								},
								includeOtherFields: false,
								options: {
									numberOfItems: 5,
								},
							},
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [200, 0],
							id: 'create-items',
							name: 'Create 5 Items',
						},
						{
							parameters: {
								source: 'database',
								workflowId: {
									__rl: true,
									value: childWorkflowId,
									mode: 'id',
								},
								options: {
									// This is the critical setting - "Run once for each item"
									mode: 'each',
									// Wait for Sub-Workflow Completion must be enabled
									waitForSubWorkflow: true,
								},
							},
							type: 'n8n-nodes-base.executeWorkflow',
							typeVersion: 1.1,
							position: [400, 0],
							id: 'execute-workflow',
							name: 'Execute Workflow',
						},
						{
							parameters: {
								mode: 'combine',
								combineBy: 'combineAll',
								options: {},
							},
							type: 'n8n-nodes-base.merge',
							typeVersion: 3,
							position: [600, 0],
							id: 'merge-results',
							name: 'Merge Results',
						},
					],
					connections: {
						Webhook: {
							main: [
								[
									{
										node: 'Create 5 Items',
										type: 'main',
										index: 0,
									},
								],
							],
						},
						'Create 5 Items': {
							main: [
								[
									{
										node: 'Execute Workflow',
										type: 'main',
										index: 0,
									},
								],
							],
						},
						'Execute Workflow': {
							main: [
								[
									{
										node: 'Merge Results',
										type: 'main',
										index: 0,
									},
								],
							],
						},
					},
					active: true,
					pinData: {},
				});

			// Trigger the parent workflow via webhook
			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`);
			expect(webhookResponse.ok()).toBe(true);

			// Wait for all 5 sub-workflow executions to complete
			await retryUntil(
				async () => {
					const childExecutions = await api.workflows.getExecutions(childWorkflowId, 50);
					const completedChildren = childExecutions.filter(
						(e) => e.workflowId === childWorkflowId && e.status === 'success',
					);
					expect(completedChildren.length).toBe(5);
				},
				{ timeoutMs: 15000, intervalMs: 500 },
			);

			// Verify all child executions are successful
			const childExecutions = await api.workflows.getExecutions(childWorkflowId, 50);
			const childrenForThisRun = childExecutions
				.filter((e) => e.workflowId === childWorkflowId)
				.slice(0, 5);
			for (const child of childrenForThisRun) {
				expect(child.status).toBe('success');
			}

			// THIS IS THE FAILING ASSERTION: Parent workflow should complete successfully
			// In v2.16.0, it gets stuck in "waiting" state instead
			const parentExecution = await api.workflows.waitForExecution(
				parentWorkflowId,
				20000,
				'webhook',
			);

			// Verify parent execution completed successfully
			expect(parentExecution.status).toBe('success');

			// Verify parent workflow is not stuck in waiting state
			const parentExecutions = await api.workflows.getExecutions(parentWorkflowId, 10);
			const latestParent = parentExecutions.find((e) => e.workflowId === parentWorkflowId);
			expect(latestParent?.status).not.toBe('waiting');
		});

		test('should handle single item execution correctly (baseline test)', async ({ api }) => {
			// Create a simple sub-workflow
			const { workflowId: childWorkflowId } = await api.workflows.createWorkflowFromDefinition({
				name: 'Sub-workflow - Single Item',
				nodes: [
					{
						parameters: {
							inputSource: 'passthrough',
						},
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						typeVersion: 1.1,
						position: [0, 0],
						id: 'execute-workflow-trigger',
						name: 'When Executed by Another Workflow',
					},
				],
				connections: {},
				active: false,
				pinData: {},
			});

			// Create parent workflow with SINGLE item (this should work)
			const { webhookPath, workflowId: parentWorkflowId } =
				await api.workflows.createWorkflowFromDefinition({
					name: 'Parent Workflow - Single Item',
					nodes: [
						{
							parameters: {
								path: 'test-webhook-single',
								responseMode: 'lastNode',
								options: {},
							},
							type: 'n8n-nodes-base.webhook',
							typeVersion: 2.1,
							position: [0, 0],
							id: 'webhook-trigger',
							name: 'Webhook',
							webhookId: 'test-webhook-single-id',
						},
						{
							parameters: {
								source: 'database',
								workflowId: {
									__rl: true,
									value: childWorkflowId,
									mode: 'id',
								},
								options: {
									waitForSubWorkflow: true,
								},
							},
							type: 'n8n-nodes-base.executeWorkflow',
							typeVersion: 1.1,
							position: [200, 0],
							id: 'execute-workflow',
							name: 'Execute Workflow',
						},
					],
					connections: {
						Webhook: {
							main: [
								[
									{
										node: 'Execute Workflow',
										type: 'main',
										index: 0,
									},
								],
							],
						},
					},
					active: true,
					pinData: {},
				});

			// Trigger the parent workflow
			const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`);
			expect(webhookResponse.ok()).toBe(true);

			// Parent should complete successfully with single item
			const parentExecution = await api.workflows.waitForExecution(
				parentWorkflowId,
				10000,
				'webhook',
			);
			expect(parentExecution.status).toBe('success');
		});
	},
);
