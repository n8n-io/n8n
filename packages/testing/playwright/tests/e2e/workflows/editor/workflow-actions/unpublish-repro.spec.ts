import { SCHEDULE_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import { nanoid } from 'nanoid';

/**
 * Bug reproduction for N8N-9936: Can't un-publish workflow
 *
 * These tests are designed to FAIL and reproduce the unpublish bug.
 * Known issue: "flaky test - 18 similar failures across 10 branches in last 14 days"
 */
test.describe(
	'Workflow Unpublish Bug Reproduction (N8N-9936)',
	{
		annotation: [
			{ type: 'owner', description: 'Engineering' },
			{ type: 'issue', description: 'N8N-9936' },
		],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test('should unpublish workflow from editor via menu', async ({ n8n }) => {
			// Setup: Create and publish a workflow
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.waitForSaveWorkflowCompleted();
			await n8n.canvas.publishWorkflow();
			await n8n.page.keyboard.press('Escape');

			// Verify workflow is published
			await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();

			// Attempt to unpublish
			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await expect(n8n.workflowSettingsModal.getUnpublishMenuItem()).toBeVisible();
			await n8n.workflowSettingsModal.clickUnpublishMenuItem();

			// Confirm unpublish modal
			await expect(n8n.workflowSettingsModal.getUnpublishModal()).toBeVisible();
			await n8n.workflowSettingsModal.confirmUnpublishModal();

			// Verify unpublish succeeded
			await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible({
				timeout: 10000,
			});
			await expect(n8n.canvas.getPublishedIndicator()).toBeHidden({ timeout: 10000 });
		});

		test('should unpublish workflow after navigating away and back', async ({ n8n }) => {
			// Setup: Create and publish a workflow
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.waitForSaveWorkflowCompleted();

			const workflowName = await n8n.page
				.getByTestId('workflow-name-input')
				.locator('input')
				.inputValue();

			await n8n.canvas.publishWorkflow();
			await n8n.page.keyboard.press('Escape');

			// Verify workflow is published
			await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();

			// Navigate away and back
			await n8n.goHome();
			await n8n.workflows.cards.getWorkflow(workflowName).click();

			// Wait for workflow to load
			await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();

			// Attempt to unpublish
			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await expect(n8n.workflowSettingsModal.getUnpublishMenuItem()).toBeVisible();
			await n8n.workflowSettingsModal.clickUnpublishMenuItem();

			// Confirm unpublish modal
			await expect(n8n.workflowSettingsModal.getUnpublishModal()).toBeVisible();
			await n8n.workflowSettingsModal.confirmUnpublishModal();

			// Verify unpublish succeeded
			await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible({
				timeout: 10000,
			});
			await expect(n8n.canvas.getPublishedIndicator()).toBeHidden({ timeout: 10000 });
		});

		test('should show unpublish menu item only for published workflows', async ({ n8n }) => {
			// Test 1: Unpublished workflow should not show unpublish menu item
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.waitForSaveWorkflowCompleted();

			await expect(n8n.canvas.getPublishedIndicator()).toBeHidden();

			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await expect(n8n.workflowSettingsModal.getUnpublishMenuItem()).not.toBeAttached();
			await n8n.page.keyboard.press('Escape');

			// Test 2: After publishing, unpublish menu item should appear
			await n8n.canvas.publishWorkflow();
			await n8n.page.keyboard.press('Escape');

			await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();

			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await expect(n8n.workflowSettingsModal.getUnpublishMenuItem()).toBeVisible();
		});

		test('should unpublish workflow with multiple nodes', async ({ n8n }) => {
			// Setup: Create a more complex workflow
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.addNode('Code', { action: 'Run JavaScript code', closeNDV: true });
			await n8n.canvas.waitForSaveWorkflowCompleted();

			await n8n.canvas.publishWorkflow();
			await n8n.page.keyboard.press('Escape');

			// Verify workflow is published
			await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();

			// Attempt to unpublish
			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await n8n.workflowSettingsModal.clickUnpublishMenuItem();

			await expect(n8n.workflowSettingsModal.getUnpublishModal()).toBeVisible();
			await n8n.workflowSettingsModal.confirmUnpublishModal();

			// Verify unpublish succeeded
			await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible({
				timeout: 10000,
			});
			await expect(n8n.canvas.getPublishedIndicator()).toBeHidden({ timeout: 10000 });
		});

		test('should handle unpublish of renamed workflow', async ({ n8n }) => {
			// Setup: Create and publish a workflow
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.waitForSaveWorkflowCompleted();

			await n8n.canvas.publishWorkflow();
			await n8n.page.keyboard.press('Escape');

			await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();

			// Rename the workflow
			const newName = `Renamed Workflow ${nanoid()}`;
			const nameInput = n8n.page.getByTestId('workflow-name-input').locator('input');
			await nameInput.click();
			await nameInput.fill(newName);
			await n8n.canvas.waitForSaveWorkflowCompleted();

			// Attempt to unpublish
			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await n8n.workflowSettingsModal.clickUnpublishMenuItem();

			await expect(n8n.workflowSettingsModal.getUnpublishModal()).toBeVisible();
			await n8n.workflowSettingsModal.confirmUnpublishModal();

			// Verify unpublish succeeded
			await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible({
				timeout: 10000,
			});
			await expect(n8n.canvas.getPublishedIndicator()).toBeHidden({ timeout: 10000 });
		});
	},
);
