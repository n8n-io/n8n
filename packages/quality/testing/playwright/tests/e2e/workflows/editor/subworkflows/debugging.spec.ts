import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../../../../fixtures/base';

const WORKFLOW_FILE = 'Subworkflow-debugging-execute-workflow.json';

const CHILD: Partial<IWorkflowBase> = {
	name: 'Linked child',
	nodes: [
		{
			id: 'start',
			name: 'Start',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			typeVersion: 1.3,
			position: [0, 0],
			parameters: { inputSource: 'passthrough' },
		},
	],
	connections: {},
	settings: { executionOrder: 'v1' },
};

function parentCalling(childId: string): Partial<IWorkflowBase> {
	return {
		name: 'Linked parent',
		nodes: [
			{
				id: 'webhook',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2.1,
				position: [0, 0],
				parameters: { path: 'execution-links', responseMode: 'onReceived', options: {} },
			},
			{
				id: 'call-child',
				name: 'Call child',
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1.3,
				position: [200, 0],
				parameters: {
					source: 'database',
					workflowId: { __rl: true, mode: 'id', value: childId },
					options: { waitForSubWorkflow: true },
				},
			},
		],
		connections: { Webhook: { main: [[{ node: 'Call child', type: 'main', index: 0 }]] } },
		settings: { executionOrder: 'v1' },
	};
}

test.describe(
	'Subworkflow debugging',
	{
		annotation: [{ type: 'owner', description: 'Core Execution' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow(WORKFLOW_FILE);

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(11);
			await n8n.canvas.clickZoomToFitButton();

			await n8n.canvas.clickExecuteWorkflowButton();
		});

		test.describe('can inspect sub executed workflow', () => {
			test('(Run once with all items/ Wait for Sub-workflow completion) (default behavior)', async ({
				n8n,
			}) => {
				await n8n.canvas.openNode('Execute Workflow with param');

				await expect(n8n.ndv.outputPanel.getItemsCount()).toContainText('2 items, 1 sub-execution');
				await expect(n8n.ndv.outputPanel.getRelatedExecutionLink()).toContainText(
					'View sub-execution',
				);
				await expect(n8n.ndv.outputPanel.getRelatedExecutionLink()).toHaveAttribute('href', /.+/);

				await expect(n8n.ndv.outputPanel.getTableHeaders()).toHaveCount(2);
				await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toHaveText('world Natalie Moore');
			});

			test('(Run once for each item/ Wait for Sub-workflow completion) param1', async ({ n8n }) => {
				await n8n.canvas.openNode('Execute Workflow with param1');

				await expect(n8n.ndv.outputPanel.getItemsCount()).toContainText('2 items, 2 sub-execution');
				await expect(n8n.ndv.outputPanel.getRelatedExecutionLink()).not.toBeAttached();

				await expect(n8n.ndv.outputPanel.getTableHeaders()).toHaveCount(3);
				await expect(n8n.ndv.outputPanel.getTbodyCellLink(0, 0)).toHaveAttribute('href', /.+/);
				await expect(n8n.ndv.outputPanel.getTbodyCell(0, 1)).toHaveText('world Natalie Moore');
			});

			test('(Run once with all items/ Wait for Sub-workflow completion) param2', async ({
				n8n,
			}) => {
				await n8n.canvas.openNode('Execute Workflow with param2');

				await expect(n8n.ndv.outputPanel.getItemsCount()).not.toBeAttached();
				await expect(n8n.ndv.outputPanel.getRelatedExecutionLink()).toContainText(
					'View sub-execution',
				);
				await expect(n8n.ndv.outputPanel.getRelatedExecutionLink()).toHaveAttribute('href', /.+/);

				await expect(n8n.ndv.outputPanel.getRunSelectorInput()).toHaveValue(
					'2 of 2 (3 items, 1 sub-execution)',
				);
				await expect(n8n.ndv.outputPanel.getTableHeaders()).toHaveCount(6);
				await expect(n8n.ndv.outputPanel.getTableHeader(0)).toHaveText('uid');
				await expect(n8n.ndv.outputPanel.getTableRows()).toHaveCount(4);
				await expect(n8n.ndv.outputPanel.getTbodyCell(0, 1)).toContainText('Jon_Ebert@yahoo.com');

				await n8n.ndv.changeOutputRunSelector('1 of 2 (2 items, 1 sub-execution)');
				await expect(n8n.ndv.outputPanel.getRunSelectorInput()).toHaveValue(
					'1 of 2 (2 items, 1 sub-execution)',
				);
				await expect(n8n.ndv.outputPanel.getTableHeaders()).toHaveCount(6);
				await expect(n8n.ndv.outputPanel.getTableHeader(0)).toHaveText('uid');
				await expect(n8n.ndv.outputPanel.getTableRows()).toHaveCount(3);
				await expect(n8n.ndv.outputPanel.getTbodyCell(0, 1)).toContainText(
					'Terry.Dach@hotmail.com',
				);
			});

			test('(Run once for each item/ Wait for Sub-workflow completion) param3', async ({ n8n }) => {
				await n8n.canvas.openNode('Execute Workflow with param3');

				await expect(n8n.ndv.outputPanel.getRunSelectorInput()).toHaveValue(
					'2 of 2 (3 items, 3 sub-executions)',
				);
				await expect(n8n.ndv.outputPanel.getTableHeaders()).toHaveCount(7);
				await expect(n8n.ndv.outputPanel.getTableHeader(1)).toHaveText('uid');
				await expect(n8n.ndv.outputPanel.getTableRows()).toHaveCount(4);
				await expect(n8n.ndv.outputPanel.getTbodyCellLink(0, 0)).toHaveAttribute('href', /.+/);
				await expect(n8n.ndv.outputPanel.getTbodyCell(0, 2)).toContainText('Jon_Ebert@yahoo.com');

				await n8n.ndv.changeOutputRunSelector('1 of 2 (2 items, 2 sub-executions)');
				await expect(n8n.ndv.outputPanel.getRunSelectorInput()).toHaveValue(
					'1 of 2 (2 items, 2 sub-executions)',
				);
				await expect(n8n.ndv.outputPanel.getTableHeaders()).toHaveCount(7);
				await expect(n8n.ndv.outputPanel.getTableHeader(1)).toHaveText('uid');
				await expect(n8n.ndv.outputPanel.getTableRows()).toHaveCount(3);

				await expect(n8n.ndv.outputPanel.getTbodyCellLink(0, 0)).toHaveAttribute('href', /.+/);
				await expect(n8n.ndv.outputPanel.getTbodyCell(0, 2)).toContainText(
					'Terry.Dach@hotmail.com',
				);
			});
		});
	},
);

test.describe(
	'Execution links',
	{
		annotation: [{ type: 'owner', description: 'Core Execution' }],
	},
	() => {
		test('links a saved parent execution and its sub-execution both ways @engine:v2', async ({
			n8n,
			api,
		}) => {
			const child = await api.workflows.importWorkflowFromDefinition(CHILD);
			await api.workflows.activate(child.workflowId, child.createdWorkflow.versionId!);
			const parent = await api.workflows.importWorkflowFromDefinition(
				parentCalling(child.workflowId),
			);
			await api.workflows.activate(parent.workflowId, parent.createdWorkflow.versionId!);

			await api.webhooks.trigger(`/webhook/${parent.webhookPath}`, { maxNotFoundRetries: 5 });
			const parentExecution = await api.workflows.waitForExecution(parent.workflowId, 15_000);
			expect(parentExecution.status).toBe('success');

			await n8n.navigate.toExecution(parent.workflowId, parentExecution.id);
			await n8n.executions.openNodeExecutionDetails('Call child');
			const subExecutionLink = n8n.ndv.outputPanel.getRelatedExecutionLink();
			await expect(subExecutionLink).toContainText('View sub-execution');
			const subExecutionUrl = new RegExp(`/workflow/${child.workflowId}/executions/([^/?#]+)$`);
			await expect(subExecutionLink).toHaveAttribute('href', subExecutionUrl);
			const href = await subExecutionLink.getAttribute('href');
			const childExecutionId = subExecutionUrl.exec(href!)![1];

			await n8n.navigate.toExecution(child.workflowId, childExecutionId);
			await n8n.executions.openNodeExecutionDetails('Start');
			const parentExecutionLink = n8n.ndv.outputPanel.getRelatedExecutionLink();
			await expect(parentExecutionLink).toContainText(
				`View parent execution ${parentExecution.id}`,
			);
			await expect(parentExecutionLink).toHaveAttribute(
				'href',
				new RegExp(`/workflow/${parent.workflowId}/executions/${parentExecution.id}$`),
			);
		});
	},
);
