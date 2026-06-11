import { nanoid } from 'nanoid';

import { SCHEDULE_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import type { ApiHelpers } from '../../../../../services/api-helper';

async function createWorkflowWithSingleNode(api: ApiHelpers): Promise<string> {
	const { id: workflowId } = await api.workflows.createWorkflow({
		name: `Test Workflow ${nanoid()}`,
		nodes: [
			{
				id: nanoid(),
				name: 'Schedule Trigger',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1.2,
				position: [250, 300] as [number, number],
				parameters: {},
			},
		],
		connections: {},
	});

	return String(workflowId);
}

test.describe(
	'Workflow Archive',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should display archived workflow in read-only mode on canvas', async ({ n8n, api }) => {
			const workflowId = await createWorkflowWithSingleNode(api);
			await api.workflows.archive(workflowId);
			await n8n.navigate.toWorkflow(workflowId);

			// Verify archived tag is visible
			await expect(n8n.canvas.getArchivedTag()).toBeVisible();

			// Verify canvas is in read-only mode - node creator should not be available
			await expect(n8n.canvas.getNodeCreatorPlusButton()).not.toBeAttached();

			// Try to click on the canvas where plus button would be - should not open node creator
			const canvasPlusButtonArea = n8n.page.getByTestId('node-creator-plus-button');
			await expect(canvasPlusButtonArea).not.toBeAttached();

			// Try to interact with a node - clicking should not allow editing
			const scheduleNode = n8n.canvas.nodeByName('Schedule Trigger');
			await expect(scheduleNode).toBeVisible();

			// Click the node - in read-only mode, this should not trigger edit mode
			await scheduleNode.click();

			// Node toolbar action buttons should not be present in read-only mode
			await expect(n8n.page.getByTestId('execute-node-button')).not.toBeAttached();
			await expect(n8n.page.getByTestId('delete-node-button')).not.toBeAttached();
			await expect(n8n.page.getByTestId('disable-node-button')).not.toBeAttached();

			// Try to drag a node - this should not work in read-only mode
			const nodeBox = await scheduleNode.boundingBox();
			expect(nodeBox).not.toBeNull();

			await scheduleNode.hover();
			await n8n.page.mouse.down();
			await n8n.page.mouse.move(nodeBox!.x + 100, nodeBox!.y + 100);
			await n8n.page.mouse.up();

			const newNodeBox = await scheduleNode.boundingBox();
			expect(newNodeBox?.x).toBe(nodeBox!.x);
			expect(newNodeBox?.y).toBe(nodeBox!.y);

			// Verify that autosave does NOT trigger when attempting to edit
			// Listen for save requests - there should be none
			let saveRequestDetected = false;
			n8n.page.on('request', (request) => {
				if (request.url().includes('/rest/workflows/') && request.method() === 'PATCH') {
					saveRequestDetected = true;
				}
			});

			// Wait a bit to ensure no autosave is triggered
			// eslint-disable-next-line playwright/no-wait-for-timeout
			await n8n.page.waitForTimeout(2000);

			// Verify no save request was made
			expect(saveRequestDetected).toBe(false);
		});

		test('should not trigger autosave when pasting nodes on an archived workflow', async ({
			n8n,
			api,
		}) => {
			const workflowId = await createWorkflowWithSingleNode(api);
			await api.workflows.archive(workflowId);
			await n8n.navigate.toWorkflow(workflowId);
			await expect(n8n.canvas.getArchivedTag()).toBeVisible();

			let saveRequestDetected = false;
			n8n.page.on('request', (request) => {
				if (request.url().includes('/rest/workflows/') && request.method() === 'PATCH') {
					saveRequestDetected = true;
				}
			});

			const workflowData = JSON.stringify({
				nodes: [
					{
						parameters: {},
						id: 'paste-test-node',
						name: 'No Operation, do nothing',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [300, 300],
					},
				],
				connections: {},
			});
			await n8n.clipboard.paste(workflowData);

			// eslint-disable-next-line playwright/no-wait-for-timeout
			await n8n.page.waitForTimeout(2000);

			expect(saveRequestDetected).toBe(false);
			await expect(n8n.notifications.getErrorNotifications().first()).not.toBeAttached();
		});

		test('should not be able to archive or delete unsaved workflow', async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();

			await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
			await n8n.workflowSettingsModal.getWorkflowMenu().click();

			await expect(n8n.workflowSettingsModal.getDeleteMenuItem()).toBeHidden();
			await expect(n8n.workflowSettingsModal.getArchiveMenuItemWrapper()).toHaveClass(
				/is-disabled/,
			);
		});

		test('should archive nonactive workflow and then delete it', async ({ n8n, api }) => {
			const workflowId = await createWorkflowWithSingleNode(api);
			await api.workflows.archive(workflowId);
			await n8n.navigate.toWorkflow(workflowId);

			await expect(n8n.canvas.getArchivedTag()).toBeVisible();
			await expect(n8n.canvas.getNodeCreatorPlusButton()).not.toBeAttached();

			await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await n8n.workflowSettingsModal.clickDeleteMenuItem();
			await n8n.workflowSettingsModal.confirmDeleteModal();

			await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(n8n.page).toHaveURL(/\/workflows$/);
		});

		test('should archive published workflow and then delete it', async ({ n8n, api }) => {
			const workflowId = await createWorkflowWithSingleNode(api);
			await n8n.navigate.toWorkflow(workflowId);
			await n8n.canvas.publishWorkflow();
			await n8n.page.keyboard.press('Escape');

			await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();
			await expect(n8n.canvas.getArchivedTag()).not.toBeAttached();

			await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await n8n.workflowSettingsModal.clickArchiveMenuItem();
			await n8n.workflowSettingsModal.confirmArchiveModal();

			await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(n8n.page).toHaveURL(/\/workflows$/);

			await n8n.navigate.toWorkflow(workflowId);

			await expect(n8n.canvas.getArchivedTag()).toBeVisible();
			await expect(n8n.canvas.getNodeCreatorPlusButton()).not.toBeAttached();
			await expect(n8n.canvas.getPublishedIndicator()).toBeHidden();

			await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await n8n.workflowSettingsModal.clickDeleteMenuItem();
			await n8n.workflowSettingsModal.confirmDeleteModal();

			await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(n8n.page).toHaveURL(/\/workflows$/);
		});

		test('should archive nonactive workflow and then unarchive it', async ({ n8n, api }) => {
			const workflowId = await createWorkflowWithSingleNode(api);
			await api.workflows.archive(workflowId);
			await n8n.navigate.toWorkflow(workflowId);

			await expect(n8n.canvas.getArchivedTag()).toBeVisible();
			await expect(n8n.canvas.getNodeCreatorPlusButton()).not.toBeAttached();

			await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await n8n.workflowSettingsModal.clickUnarchiveMenuItem();

			await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(n8n.canvas.getArchivedTag()).not.toBeAttached();
			await expect(n8n.canvas.getNodeCreatorPlusButton()).toBeVisible();
		});

		test('should not show unpublish menu item for non-published workflow', async ({ n8n, api }) => {
			const { id: workflowId } = await api.workflows.createWorkflow({
				name: `Test Workflow ${nanoid()}`,
				nodes: [],
				connections: {},
			});
			await n8n.navigate.toWorkflow(workflowId);

			await expect(n8n.canvas.getPublishedIndicator()).toBeHidden();

			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await expect(n8n.workflowSettingsModal.getUnpublishMenuItem()).not.toBeAttached();
		});

		// TODO: flaky test - 18 similar failures across 10 branches in last 14 days
		test.fixme('should unpublish a published workflow', async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await n8n.page.keyboard.press('Escape');

			await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();

			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await n8n.workflowSettingsModal.clickUnpublishMenuItem();

			await expect(n8n.workflowSettingsModal.getUnpublishModal()).toBeVisible();
			await n8n.workflowSettingsModal.confirmUnpublishModal();

			await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(n8n.canvas.getPublishedIndicator()).toBeHidden();
		});

		test('should unpublish published workflow on archive', async ({ n8n, api }) => {
			const workflowId = await createWorkflowWithSingleNode(api);
			await n8n.navigate.toWorkflow(workflowId);
			await n8n.canvas.publishWorkflow();
			await n8n.page.keyboard.press('Escape');

			await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();

			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await n8n.workflowSettingsModal.clickArchiveMenuItem();
			await n8n.workflowSettingsModal.confirmArchiveModal();

			await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(n8n.page).toHaveURL(/\/workflows$/);

			await n8n.navigate.toWorkflow(workflowId);

			await expect(n8n.canvas.getArchivedTag()).toBeVisible();
			await expect(n8n.canvas.getPublishedIndicator()).toBeHidden();
			await expect(n8n.canvas.getPublishButton()).toBeHidden();

			await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await n8n.workflowSettingsModal.clickUnarchiveMenuItem();

			await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
			await expect(n8n.canvas.getArchivedTag()).not.toBeAttached();

			await n8n.canvas.publishWorkflow();
			await n8n.page.keyboard.press('Escape');

			await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();
			await expect(n8n.canvas.getOpenPublishModalButton()).toBeVisible();
		});
	},
);
