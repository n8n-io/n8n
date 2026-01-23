import {
	MANUAL_TRIGGER_NODE_NAME,
	NOTION_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe('Workflow Publish', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should not be able to publish workflow without trigger node', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.waitForSaveWorkflowCompleted();

		await expect(n8n.canvas.getOpenPublishModalButton()).toBeDisabled();
	});

	test('should be able to publish workflow', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.waitForSaveWorkflowCompleted();

		await expect(n8n.canvas.getPublishedIndicator()).not.toBeVisible();

		await n8n.canvas.publishWorkflow();

		await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();
	});

	test('should not be able to publish workflow when nodes have errors', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block', closeNDV: true });
		await n8n.canvas.waitForSaveWorkflowCompleted();

		await expect(n8n.canvas.getOpenPublishModalButton()).toBeDisabled();
	});

	test('should be able to publish workflow when nodes with errors are disabled', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block', closeNDV: true });
		await n8n.canvas.waitForSaveWorkflowCompleted();

		await expect(n8n.canvas.getOpenPublishModalButton()).toBeDisabled();

		const nodeName = await n8n.canvas.getCanvasNodes().last().getAttribute('data-node-name');
		await n8n.canvas.toggleNodeEnabled(nodeName!);
		await n8n.canvas.waitForSaveWorkflowCompleted();

		await n8n.canvas.publishWorkflow();

		await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();
	});

	test.describe('Webhook conflict validation', () => {
		const cleanupWorkflowIds: string[] = [];

		test.afterEach(async ({ api }) => {
			while (cleanupWorkflowIds.length > 0) {
				try {
					// delete workflows created during tests. If a happy path test is flacky, it would fail on next execution
					// due to webhook conflicts if the created workflow/webhooks is still active
					const workflowId = cleanupWorkflowIds.pop();
					await api.workflows.deactivate(workflowId!);
					await api.workflows.delete(workflowId!);
				} catch {
					// ignore potential errors in the cleanup process
				}
			}
		});

		test('successfully publishes a workflow without webhook conflicts', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'webhook-origin-isolation.json',
			);

			cleanupWorkflowIds.push(workflowId);

			await expect(
				api.workflows.activate(workflowId, createdWorkflow.versionId!),
			).resolves.not.toThrow();
		});

		test('Rejects publishing a workflow containing webhook conflicts with published workflow', async ({
			api,
		}) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'webhook-publish-no-conflicts.json',
				{ makeUnique: false },
			);
			cleanupWorkflowIds.push(workflowId);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const { workflowId: workflowId2, createdWorkflow: createdWorkflow2 } =
				await api.workflows.importWorkflowFromFile('webhook-publish-no-conflicts.json', {
					makeUnique: false,
					transform: ({ id, ...workflow }) => ({
						...workflow,
						id: Date.now().toString(),
					}),
				});
			cleanupWorkflowIds.push(workflowId2);

			await expect(
				api.workflows.activate(workflowId2, createdWorkflow2.versionId!),
			).rejects.toThrow('There is a conflict with one of the webhooks');
		});

		test('Rejects publishing a workflow containing local conflicts', async ({ api }) => {
			const { workflowId, createdWorkflow } = await api.workflows.importWorkflowFromFile(
				'webhook-publish-local-conflict.json',
				{ makeUnique: false },
			);
			cleanupWorkflowIds.push(workflowId);

			await expect(api.workflows.activate(workflowId, createdWorkflow.versionId!)).rejects.toThrow(
				'There is a conflict with one of the webhooks',
			);
		});
	});
});
