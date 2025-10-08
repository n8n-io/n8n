import fs from 'fs';

import {
	CODE_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	NOTION_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../config/constants';
import { test, expect } from '../../fixtures/base';
import { resolveFromRoot } from '../../utils/path-helper';

test.describe('Workflow Actions', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should be able to save on button click', async ({ n8n }) => {
		const saveButton = n8n.canvas.getWorkflowSaveButton();

		await expect(saveButton).toContainText('Save');

		await n8n.canvas.saveWorkflow();

		await expect(saveButton).toContainText('Saved');

		const tagName = await saveButton.evaluate((el) => el.tagName);
		expect(tagName).toBe('SPAN');

		await expect(n8n.page).not.toHaveURL(/\/workflow\/new$/);
		await expect(n8n.page).toHaveURL(/\/workflow\/[a-zA-Z0-9]+$/);
	});

	test('should save workflow on keyboard shortcut', async ({ n8n }) => {
		const saveButton = n8n.canvas.getWorkflowSaveButton();

		await n8n.canvas.deselectAll();

		await n8n.canvas.hitSaveWorkflow();

		await expect(saveButton).toContainText('Saved');

		const tagName = await saveButton.evaluate((el) => el.tagName);
		expect(tagName).toBe('SPAN');
	});

	test('should not save already saved workflow', async ({ n8n }) => {
		const patchRequests: string[] = [];
		n8n.page.on('request', (request) => {
			if (request.method() === 'PATCH' && request.url().includes('/rest/workflows/')) {
				patchRequests.push(request.url());
			}
		});

		const saveButton = n8n.canvas.getWorkflowSaveButton();
		await expect(saveButton).toContainText('Save');
		await n8n.canvas.saveWorkflow();
		await expect(saveButton).toContainText('Saved');

		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);

		const patchPromise = n8n.page.waitForRequest(
			(req) => req.method() === 'PATCH' && req.url().includes('/rest/workflows/'),
		);
		await n8n.canvas.saveWorkflow();
		await patchPromise;
		await expect(saveButton).toContainText('Saved');

		expect(await saveButton.evaluate((el) => el.tagName)).toBe('SPAN');

		await n8n.canvas.hitSaveWorkflow();
		await n8n.canvas.hitSaveWorkflow();

		expect(patchRequests).toHaveLength(1);
	});

	test('should not be able to activate unsaved workflow', async ({ n8n }) => {
		await expect(n8n.canvas.getWorkflowActivatorSwitch().locator('input').first()).toBeDisabled();
	});

	test('should not be able to activate workflow without trigger node', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();

		await expect(n8n.canvas.getWorkflowActivatorSwitch().locator('input').first()).toBeDisabled();
	});

	test('should be able to activate workflow', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();

		await expect(n8n.canvas.getWorkflowActivatorSwitch()).toHaveClass(/is-checked/);
	});

	test('should not be able to activate workflow when nodes have errors', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block', closeNDV: true });
		await n8n.canvas.saveWorkflow();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();

		await n8n.canvas.getWorkflowActivatorSwitch().click();

		await expect(n8n.notifications.getErrorNotifications().first()).toBeVisible();
	});

	test('should be able to activate workflow when nodes with errors are disabled', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block', closeNDV: true });
		await n8n.canvas.saveWorkflow();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();

		await n8n.canvas.getWorkflowActivatorSwitch().click();

		await expect(n8n.notifications.getErrorNotifications().first()).toBeVisible();

		const nodeName = await n8n.canvas.getCanvasNodes().last().getAttribute('data-node-name');
		await n8n.canvas.toggleNodeEnabled(nodeName!);

		await n8n.canvas.activateWorkflow();

		await expect(n8n.canvas.getWorkflowActivatorSwitch()).toHaveClass(/is-checked/);
	});

	test('should save new workflow after renaming', async ({ n8n }) => {
		await n8n.canvas.setWorkflowName('Something else');
		await n8n.canvas.getWorkflowNameInput().press('Enter');

		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');
	});

	test('should rename workflow', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();

		await n8n.canvas.setWorkflowName('Something else');
		await n8n.canvas.getWorkflowNameInput().press('Enter');

		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');
		await expect(n8n.canvas.getWorkflowName()).toHaveAttribute('title', 'Something else');
	});

	test('should not save workflow if canvas is loading', async ({ n8n }) => {
		let patchCount = 0;

		n8n.page.on('request', (req) => {
			if (req.method() === 'PATCH' && req.url().includes('/rest/workflows/')) {
				patchCount++;
			}
		});

		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();

		await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');
		const workflowId = n8n.canvas.getWorkflowIdFromUrl();

		await n8n.canvasComposer.delayWorkflowLoad(workflowId);

		await n8n.page.reload();
		await expect(n8n.canvas.getLoadingMask()).toBeVisible();

		await n8n.canvas.hitSaveWorkflow();
		await n8n.canvas.hitSaveWorkflow();
		await n8n.canvas.hitSaveWorkflow();

		expect(patchCount).toBe(0);

		await expect(n8n.page.getByTestId('node-view-loader')).not.toBeAttached();
		await expect(n8n.canvas.getLoadingMask()).not.toBeAttached();
		await n8n.canvasComposer.undelayWorkflowLoad(workflowId);

		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });

		const patchPromise = n8n.page.waitForRequest(
			(req) => req.method() === 'PATCH' && req.url().includes('/rest/workflows/'),
		);
		await n8n.canvas.hitSaveWorkflow();
		await patchPromise;

		expect(patchCount).toBe(1);
	});

	test('should not save workflow twice when save is in progress', async ({ n8n }) => {
		const oldName = await n8n.canvas.getWorkflowNameInput().inputValue();

		await n8n.canvas.getWorkflowName().click();
		await n8n.canvas.getWorkflowNameInput().press('ControlOrMeta+a');
		await n8n.canvas.getWorkflowNameInput().pressSequentially('Test');
		await n8n.canvas.getWorkflowSaveButton().click();

		await expect(n8n.canvas.getWorkflowNameInput()).toHaveValue('Test');

		await n8n.navigate.toHome();

		await expect(n8n.workflows.cards.getWorkflow(oldName)).toBeHidden();
	});

	test('should copy nodes', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript', closeNDV: true });

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

		await expect(n8n.canvas.nodeCreator.getRoot()).not.toBeAttached();

		await n8n.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

		await n8n.canvas.selectAll();
		await n8n.canvas.copyNodes();

		await n8n.notifications.waitForNotificationAndClose('Copied to clipboard');
		const clipboardText = await n8n.page.evaluate(() => navigator.clipboard.readText());
		const copiedWorkflow = JSON.parse(clipboardText);

		expect(copiedWorkflow.nodes).toHaveLength(2);
	});

	test('should paste nodes (both current and old node versions)', async ({ n8n }) => {
		const workflowJson = fs.readFileSync(
			resolveFromRoot('workflows', 'Test_workflow-actions_paste-data.json'),
			'utf-8',
		);

		await n8n.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
		await n8n.page.evaluate(async (data) => {
			await navigator.clipboard.writeText(data);
		}, workflowJson);

		await n8n.canvas.canvasPane().click();
		await n8n.canvas.hitPaste();
		await n8n.canvas.clickZoomToFitButton();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(5);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(5);
	});

	test('should allow importing nodes without names', async ({ n8n }) => {
		const workflowJson = fs.readFileSync(
			resolveFromRoot('workflows', 'Test_workflow-actions_import_nodes_empty_name.json'),
			'utf-8',
		);

		await n8n.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
		await n8n.page.evaluate(async (data) => {
			await navigator.clipboard.writeText(data);
		}, workflowJson);

		await n8n.canvas.canvasPane().click();
		await n8n.canvas.hitPaste();
		await n8n.canvas.clickZoomToFitButton();

		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);
		await expect(n8n.canvas.nodeConnections()).toHaveCount(2);

		const nodes = n8n.canvas.getCanvasNodes();
		const count = await nodes.count();
		for (let i = 0; i < count; i++) {
			await expect(nodes.nth(i)).toHaveAttribute('data-node-name');
		}
	});

	test('should update workflow settings', async ({ n8n }) => {
		await n8n.navigate.toHome();

		const workflowsResponsePromise = n8n.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/workflows') && response.request().method() === 'GET',
		);

		await n8n.workflows.addResource.workflow();

		const workflowsResponse = await workflowsResponsePromise;
		const responseBody = await workflowsResponse.json();
		const totalWorkflows = responseBody.count;

		await n8n.canvas.saveWorkflow();

		await n8n.workflowSettingsModal.open();
		await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();

		await n8n.workflowSettingsModal.getErrorWorkflowField().click();
		await expect(n8n.page.getByRole('option')).toHaveCount(totalWorkflows + 2);
		await n8n.page.getByRole('option').last().click();

		await n8n.workflowSettingsModal.getTimezoneField().click();
		await expect(n8n.page.getByRole('option').first()).toBeVisible();
		await n8n.page.getByRole('option').nth(1).click();

		await n8n.workflowSettingsModal.getSaveFailedExecutionsField().click();
		await expect(n8n.page.getByRole('option')).toHaveCount(3);
		await n8n.page.getByRole('option').last().click();

		await n8n.workflowSettingsModal.getSaveSuccessExecutionsField().click();
		await expect(n8n.page.getByRole('option')).toHaveCount(3);
		await n8n.page.getByRole('option').last().click();

		await n8n.workflowSettingsModal.getSaveManualExecutionsField().click();
		await expect(n8n.page.getByRole('option')).toHaveCount(3);
		await n8n.page.getByRole('option').last().click();

		await n8n.workflowSettingsModal.getSaveExecutionProgressField().click();
		await expect(n8n.page.getByRole('option')).toHaveCount(3);
		await n8n.page.getByRole('option').last().click();

		await n8n.workflowSettingsModal.getTimeoutSwitch().click();
		await n8n.workflowSettingsModal.getTimeoutInput().fill('1');

		await n8n.workflowSettingsModal.clickSave();

		await expect(n8n.workflowSettingsModal.getModal()).toBeHidden();
		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
	});

	test('should not be able to archive or delete unsaved workflow', async ({ n8n }) => {
		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();

		await expect(n8n.workflowSettingsModal.getDeleteMenuItem()).toBeHidden();
		await expect(n8n.workflowSettingsModal.getArchiveMenuItem().locator('..')).toHaveClass(
			/is-disabled/,
		);
	});

	test('should archive nonactive workflow and then delete it', async ({ n8n }) => {
		await n8n.canvas.saveWorkflow();
		await expect(n8n.canvas.getArchivedTag()).not.toBeAttached();

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickArchiveMenuItem();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.page).toHaveURL(/\/workflows$/);

		await n8n.page.goBack();

		await expect(n8n.canvas.getArchivedTag()).toBeVisible();
		await expect(n8n.canvas.getNodeCreatorPlusButton()).not.toBeAttached();

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickDeleteMenuItem();
		await n8n.workflowSettingsModal.confirmDeleteModal();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.page).toHaveURL(/\/workflows$/);
	});

	test('should archive active workflow and then delete it', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
		await n8n.page.keyboard.press('Escape');

		await expect(n8n.canvas.getWorkflowActivatorSwitch()).toHaveClass(/is-checked/);
		await expect(n8n.canvas.getArchivedTag()).not.toBeAttached();

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickArchiveMenuItem();
		await n8n.workflowSettingsModal.confirmArchiveModal();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.page).toHaveURL(/\/workflows$/);

		await n8n.page.goBack();

		await expect(n8n.canvas.getArchivedTag()).toBeVisible();
		await expect(n8n.canvas.getNodeCreatorPlusButton()).not.toBeAttached();
		await expect(n8n.canvas.getWorkflowActivatorSwitch()).not.toHaveClass(/is-checked/);

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickDeleteMenuItem();
		await n8n.workflowSettingsModal.confirmDeleteModal();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.page).toHaveURL(/\/workflows$/);
	});

	test('should archive nonactive workflow and then unarchive it', async ({ n8n }) => {
		await n8n.canvas.saveWorkflow();
		await expect(n8n.canvas.getArchivedTag()).not.toBeAttached();

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickArchiveMenuItem();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.page).toHaveURL(/\/workflows$/);

		await n8n.page.goBack();

		await expect(n8n.canvas.getArchivedTag()).toBeVisible();
		await expect(n8n.canvas.getNodeCreatorPlusButton()).not.toBeAttached();

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickUnarchiveMenuItem();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.canvas.getArchivedTag()).not.toBeAttached();
		await expect(n8n.canvas.getNodeCreatorPlusButton()).toBeVisible();
	});

	test('should deactivate active workflow on archive', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
		await n8n.page.keyboard.press('Escape');

		await expect(n8n.canvas.getWorkflowActivatorSwitch()).toHaveClass(/is-checked/);

		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickArchiveMenuItem();
		await n8n.workflowSettingsModal.confirmArchiveModal();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.page).toHaveURL(/\/workflows$/);

		await n8n.page.goBack();

		await expect(n8n.canvas.getArchivedTag()).toBeVisible();
		await expect(n8n.canvas.getWorkflowActivatorSwitch()).not.toHaveClass(/is-checked/);
		await expect(n8n.canvas.getWorkflowActivatorSwitch().locator('input').first()).toBeDisabled();

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickUnarchiveMenuItem();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.canvas.getArchivedTag()).not.toBeAttached();

		await n8n.canvas.activateWorkflow();
		await n8n.page.keyboard.press('Escape');

		await expect(n8n.canvas.getWorkflowActivatorSwitch()).toHaveClass(/is-checked/);
	});

	test.describe('duplicate workflow', () => {
		const DUPLICATE_WORKFLOW_NAME = 'Duplicated workflow';
		const DUPLICATE_WORKFLOW_TAG = 'Duplicate';

		test.beforeEach(async ({ n8n }) => {
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		});

		test('should duplicate unsaved workflow', async ({ n8n }) => {
			await n8n.workflowComposer.duplicateWorkflow(DUPLICATE_WORKFLOW_NAME, DUPLICATE_WORKFLOW_TAG);

			await expect(n8n.notifications.getErrorNotifications()).toHaveCount(0);
		});

		test('should duplicate saved workflow', async ({ n8n }) => {
			await n8n.canvas.saveWorkflow();
			await expect(n8n.canvas.getWorkflowSaveButton()).toContainText('Saved');

			await n8n.workflowComposer.duplicateWorkflow(DUPLICATE_WORKFLOW_NAME, DUPLICATE_WORKFLOW_TAG);

			await expect(n8n.notifications.getErrorNotifications()).toHaveCount(0);
		});
	});

	test('should keep endpoint click working when switching between execution and editor tab', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();

		await n8n.canvas.clickNodePlusEndpoint('Edit Fields');
		await expect(n8n.canvas.nodeCreatorSearchBar()).toBeVisible();
		await n8n.page.keyboard.press('Escape');

		const executionsResponsePromise = n8n.page.waitForResponse((response) =>
			response.url().includes('/rest/executions?filter='),
		);
		await n8n.canvas.clickExecutionsTab();
		await executionsResponsePromise;

		await n8n.canvas.clickEditorTab();

		await n8n.canvas.clickNodePlusEndpoint('Edit Fields');
		await expect(n8n.canvas.nodeCreatorSearchBar()).toBeVisible();
	});

	test('should run workflow on button click', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();

		await n8n.canvas.clickExecuteWorkflowButton();
		await expect(
			n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
		).toBeVisible();
	});

	test('should run workflow using keyboard shortcut', async ({ n8n }) => {
		await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();

		await n8n.canvas.hitExecuteWorkflow();
		await expect(
			n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
		).toBeVisible();
	});

	test('should not run empty workflows', async ({ n8n }) => {
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(0);

		await expect(n8n.canvas.getExecuteWorkflowButton()).not.toBeAttached();

		await n8n.canvas.hitExecuteWorkflow();
		await expect(n8n.notifications.getSuccessNotifications()).toHaveCount(0);
	});

	test.describe('Menu entry Push To Git', () => {
		test('should not show up in the menu for members @auth:member', async ({ n8n }) => {
			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await expect(n8n.workflowSettingsModal.getPushToGitMenuItem()).not.toBeAttached();
		});

		test('should show up for owners @auth:owner', async ({ n8n }) => {
			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await expect(n8n.workflowSettingsModal.getPushToGitMenuItem()).toBeVisible();
		});
	});
});
