import {
	CODE_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe('NDV', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should show up when double clicked on a node and close when Back to canvas clicked', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode('Manual Trigger');
		const canvasNodes = n8n.canvas.getCanvasNodes();
		await canvasNodes.first().dblclick();
		await expect(n8n.ndv.getContainer()).toBeVisible();
		await n8n.ndv.clickBackToCanvasButton();
		await expect(n8n.ndv.getContainer()).toBeHidden();
	});

	test('should show input panel when node is not connected', async ({ n8n }) => {
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.deselectAll();
		await n8n.canvas.addNode('Edit Fields (Set)', { closeNDV: true });
		const canvasNodes = n8n.canvas.getCanvasNodes();
		await canvasNodes.last().dblclick();
		await expect(n8n.ndv.getContainer()).toBeVisible();
		await expect(n8n.ndv.inputPanel.get()).toContainText('No input connected');
	});

	test('should change input and go back to canvas', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('NDV-test-select-input.json');
		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.getCanvasNodes().last().dblclick();
		await n8n.ndv.execute();

		await n8n.ndv.inputPanel.switchDisplayMode('table');

		await n8n.ndv.inputPanel.getNodeInputOptions().last().click();

		await expect(n8n.ndv.inputPanel.get()).toContainText('start');

		await n8n.ndv.clickBackToCanvasButton();
		await expect(n8n.ndv.getContainer()).toBeHidden();
	});

	test('should show correct validation state for resource locator params', async ({ n8n }) => {
		await n8n.canvas.addNode('Typeform Trigger', { closeNDV: false });
		await expect(n8n.ndv.getContainer()).toBeVisible();

		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.openNode('Typeform Trigger');
		await expect(n8n.canvas.getNodeIssuesByName('Typeform Trigger')).toBeVisible();
	});

	test('should show validation errors only after blur or re-opening of NDV', async ({ n8n }) => {
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Airtable', { closeNDV: false, action: 'Search records' });
		await expect(n8n.ndv.getContainer()).toBeVisible();

		await expect(n8n.canvas.getNodeIssuesByName('Airtable')).toBeHidden();

		await n8n.ndv.getParameterInputField('table').nth(1).focus();
		await n8n.ndv.getParameterInputField('table').nth(1).blur();
		await n8n.ndv.getParameterInputField('base').nth(1).focus();
		await n8n.ndv.getParameterInputField('base').nth(1).blur();

		await expect(n8n.ndv.getParameterInput('base')).toHaveClass(/has-issues|error|invalid/);
		await expect(n8n.ndv.getParameterInput('table')).toHaveClass(/has-issues|error|invalid/);

		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.openNode('Search records');
		await expect(n8n.canvas.getNodeIssuesByName('Search records')).toBeVisible();
	});

	test('should show all validation errors when opening pasted node', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_ndv_errors.json');
		const canvasNodes = n8n.canvas.getCanvasNodes();
		await expect(canvasNodes).toHaveCount(1);

		await n8n.canvas.openNode('Airtable');
		await expect(n8n.canvas.getNodeIssuesByName('Airtable')).toBeVisible();
	});

	test('should render run errors correctly', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_ndv_run_error.json');
		await n8n.canvas.openNode('Error');
		await n8n.ndv.execute();

		await expect(n8n.ndv.getNodeRunErrorMessage()).toHaveText(
			"Paired item data for item from node 'Break pairedItem chain' is unavailable. Ensure 'Break pairedItem chain' is providing the required output.",
		);

		await expect(n8n.ndv.getNodeRunErrorDescription()).toContainText(
			"An expression here won't work because it uses .item and n8n can't figure out the matching item.",
		);

		await expect(n8n.ndv.getNodeRunErrorMessage()).toBeVisible();
		await expect(n8n.ndv.getNodeRunErrorDescription()).toBeVisible();
	});

	test('should save workflow using keyboard shortcut from NDV', async ({ n8n }) => {
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Edit Fields (Set)', { closeNDV: false });
		await expect(n8n.ndv.getContainer()).toBeVisible();

		await n8n.page.keyboard.press('ControlOrMeta+s');

		await expect(n8n.canvas.getWorkflowSaveButton()).toBeHidden();
	});

	test('webhook should fallback to webhookId if path is empty', async ({ n8n }) => {
		await n8n.canvas.addNode('Webhook', { closeNDV: false });

		await expect(n8n.canvas.getNodeIssuesByName('Webhook')).toBeHidden();
		await expect(n8n.ndv.getExecuteNodeButton()).toBeEnabled();
		await expect(n8n.ndv.getTriggerPanelExecuteButton()).toBeVisible();

		await n8n.ndv.getParameterInputField('path').clear();

		const webhookUrlsContainer = n8n.ndv.getContainer().getByText('Webhook URLs').locator('..');
		const urlText = await webhookUrlsContainer.textContent();
		const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
		expect(urlText).toMatch(uuidRegex);

		await n8n.ndv.close();

		await n8n.canvas.openNode('Webhook');
		await n8n.ndv.fillParameterInput('path', 'test-path');

		const updatedUrlText = await webhookUrlsContainer.textContent();
		expect(updatedUrlText).toContain('test-path');
		expect(updatedUrlText).not.toMatch(uuidRegex);
	});

	test('should properly show node execution indicator', async ({ n8n }) => {
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: false });

		await expect(n8n.ndv.getNodeRunSuccessIndicator()).toBeHidden();
		await expect(n8n.ndv.getNodeRunErrorIndicator()).toBeHidden();
		await expect(n8n.ndv.getNodeRunTooltipIndicator()).toBeHidden();

		await n8n.ndv.execute();

		await expect(n8n.ndv.getNodeRunSuccessIndicator()).toBeVisible();
		await expect(n8n.ndv.getNodeRunTooltipIndicator()).toBeVisible();
	});

	test('should show node name and version in settings', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_ndv_version.json');

		await n8n.canvas.openNode('Edit Fields (old)');
		await n8n.ndv.openSettings();
		await expect(n8n.ndv.getNodeVersion()).toContainText('Set node version 2');
		await expect(n8n.ndv.getNodeVersion()).toContainText('Latest version: 3.4');
		await n8n.ndv.close();

		await n8n.canvas.openNode('Edit Fields (latest)');
		await n8n.ndv.openSettings();
		await expect(n8n.ndv.getNodeVersion()).toContainText('Edit Fields (Set) node version 3.4');
		await expect(n8n.ndv.getNodeVersion()).toContainText('Latest');
		await n8n.ndv.close();

		await n8n.canvas.openNode('Function');
		await n8n.ndv.openSettings();
		await expect(n8n.ndv.getNodeVersion()).toContainText('Function node version 1');
		await expect(n8n.ndv.getNodeVersion()).toContainText('Deprecated');
		await n8n.ndv.close();
	});

	test('should not push NDV header out with a lot of code in Code node editor', async ({ n8n }) => {
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: false });

		const codeEditor = n8n.ndv.getParameterInput('jsCode').locator('.cm-content');
		await codeEditor.click();
		await n8n.page.keyboard.press('ControlOrMeta+a');
		await n8n.page.keyboard.press('Delete');

		const dummyCode = Array(50)
			.fill(
				'console.log("This is a very long line of dummy JavaScript code that should not push the NDV header out of view");',
			)
			.join('\n');

		await codeEditor.fill(dummyCode);

		await expect(n8n.ndv.getExecuteNodeButton()).toBeVisible();
	});

	test('should allow editing code in fullscreen in the code editors', async ({ n8n }) => {
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: false });

		await n8n.ndv.openCodeEditorFullscreen();

		const fullscreenEditor = n8n.ndv.getCodeEditorFullscreen();
		await fullscreenEditor.click();
		await n8n.page.keyboard.press('ControlOrMeta+a');
		await fullscreenEditor.fill('foo()');

		await expect(fullscreenEditor).toContainText('foo()');

		await n8n.ndv.closeCodeEditorDialog();

		await expect(n8n.ndv.getParameterInput('jsCode').locator('.cm-content')).toContainText('foo()');
	});

	test.describe('Complex Edge Cases', () => {
		test('ADO-2931 - should handle multiple branches of the same input with the first branch empty correctly', async ({
			n8n,
		}) => {
			await n8n.canvas.importWorkflow(
				'Test_ndv_two_branches_of_same_parent_false_populated.json',
				'Multiple Branches Test',
			);

			await n8n.canvas.openNode('DebugHelper');
			await expect(n8n.ndv.inputPanel.get()).toBeVisible();
			await expect(n8n.ndv.outputPanel.get()).toBeVisible();

			await n8n.ndv.execute();

			await expect(n8n.ndv.inputPanel.getSchemaItem('a1')).toBeVisible();
		});
	});

	test.describe('Execution Indicators - Multi-Node', () => {
		test('should properly show node execution indicator for multiple nodes', async ({ n8n }) => {
			await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });
			await n8n.ndv.clickBackToCanvasButton();

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await n8n.canvas.openNode(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await expect(n8n.ndv.getNodeRunSuccessIndicator()).toBeVisible();
			await expect(n8n.ndv.getNodeRunTooltipIndicator()).toBeVisible();

			await n8n.ndv.clickBackToCanvasButton();
			await n8n.canvas.openNode(CODE_NODE_DISPLAY_NAME);
			await expect(n8n.ndv.getNodeRunSuccessIndicator()).toBeVisible();
		});
	});
});
