import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';

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
		await expect(n8n.ndv.getInputPanel()).toContainText('Wire me up');
	});

	test('should test webhook node', async ({ n8n }) => {
		await n8n.canvas.addNode('Webhook', { closeNDV: false });

		await n8n.ndv.execute();

		const webhookUrl = await n8n.ndv.getWebhookUrl();
		await expect(n8n.ndv.getWebhookTriggerListening()).toBeVisible();
		const response = await n8n.ndv.makeWebhookRequest(webhookUrl as string);
		expect(response.status()).toBe(200);

		await expect(n8n.ndv.getOutputPanel()).toBeVisible();
		await expect(n8n.ndv.getOutputDataContainer()).toBeVisible();
	});

	test('should change input and go back to canvas', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('NDV-test-select-input.json');
		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.getCanvasNodes().last().dblclick();
		await n8n.ndv.execute();

		await n8n.ndv.switchInputMode('Table');

		await n8n.ndv.getNodeInputOptions().last().click();

		await expect(n8n.ndv.getInputPanel()).toContainText('start');

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

	test.describe('test output schema view', () => {
		const schemaKeys = [
			'id',
			'name',
			'email',
			'notes',
			'country',
			'created',
			'objectValue',
			'prop1',
			'prop2',
		];

		const setupSchemaWorkflow = async (n8n: n8nPage) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_schema_test.json');
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.openNode('Set');
			await n8n.ndv.execute();
		};

		test('should switch to output schema view and validate it', async ({ n8n }) => {
			await setupSchemaWorkflow(n8n);

			await n8n.ndv.switchOutputMode('Schema');

			for (const key of schemaKeys) {
				await expect(n8n.ndv.getSchemaViewItems().filter({ hasText: key })).toBeVisible();
			}
		});

		test('should preserve schema view after execution', async ({ n8n }) => {
			await setupSchemaWorkflow(n8n);

			await n8n.ndv.switchOutputMode('Schema');

			await n8n.ndv.execute();

			for (const key of schemaKeys) {
				await expect(n8n.ndv.getSchemaViewItems().filter({ hasText: key })).toBeVisible();
			}
		});

		test('should collapse and expand nested schema object', async ({ n8n }) => {
			await setupSchemaWorkflow(n8n);
			const expandedObjectProps = ['prop1', 'prop2'];

			await n8n.ndv.switchOutputMode('Schema');

			for (const key of expandedObjectProps) {
				await expect(n8n.ndv.getSchemaViewItems().filter({ hasText: key })).toBeVisible();
			}

			const objectValueItem = n8n.ndv.getSchemaViewItems().filter({ hasText: 'objectValue' });
			await objectValueItem.locator('.toggle').click();

			for (const key of expandedObjectProps) {
				await expect(n8n.ndv.getSchemaViewItems().filter({ hasText: key })).not.toBeInViewport();
			}
		});

		test('should not display pagination for schema', async ({ n8n }) => {
			await setupSchemaWorkflow(n8n);

			await n8n.ndv.clickBackToCanvasButton();
			await n8n.canvas.deselectAll();
			await n8n.canvas.nodeByName('Set').click();
			await n8n.canvas.addNode('Customer Datastore (n8n training)');

			await n8n.canvas.openNode('Customer Datastore (n8n training)');

			await n8n.ndv.execute();

			await expect(n8n.ndv.getOutputPanel().getByText('5 items')).toBeVisible();

			await n8n.ndv.switchOutputMode('Schema');

			const schemaItemsCount = await n8n.ndv.getSchemaViewItems().count();
			expect(schemaItemsCount).toBeGreaterThan(0);

			await n8n.ndv.switchOutputMode('JSON');
		});

		test('should display large schema', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_schema_test_pinned_data.json');
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.openNode('Set');

			await expect(n8n.ndv.getOutputPanel().getByText('20 items')).toBeVisible();
			await expect(n8n.ndv.getOutputPanel().locator('[class*="_pagination"]')).toBeVisible();

			await n8n.ndv.switchOutputMode('Schema');

			await expect(n8n.ndv.getOutputPanel().locator('[class*="_pagination"]')).toBeHidden();
		});
	});

	test('should display parameter hints correctly', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_3.json');
		await n8n.canvas.openNode('Set1');

		await n8n.ndv.getParameterInputField('value').clear();
		await n8n.ndv.getParameterInputField('value').fill('=');

		await n8n.ndv.getInlineExpressionEditorContent().fill('hello');
		await n8n.ndv.getParameterInputField('name').click();
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('hello');

		await n8n.ndv.getInlineExpressionEditorContent().fill('');
		await n8n.ndv.getParameterInputField('name').click();
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('[empty]');

		await n8n.ndv.getInlineExpressionEditorContent().fill(' test');
		await n8n.ndv.getParameterInputField('name').click();
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText(' test');

		await n8n.ndv.getInlineExpressionEditorContent().fill(' ');
		await n8n.ndv.getParameterInputField('name').click();
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText(' ');

		await n8n.ndv.getInlineExpressionEditorContent().fill('<div></div>');
		await n8n.ndv.getParameterInputField('name').click();
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('<div></div>');
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

	test('should keep search expanded after Execute step node run', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_ndv_search.json');
		await n8n.canvas.clickZoomToFitButton();
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);

		await n8n.canvas.openNode('Edit Fields');
		await expect(n8n.ndv.getOutputPanel()).toBeVisible();

		await n8n.ndv.searchOutputData('US');

		await expect(n8n.ndv.getOutputTableRow(1).locator('mark')).toContainText('US');

		await n8n.ndv.execute();

		await expect(n8n.ndv.getOutputSearchInput()).toBeVisible();
		await expect(n8n.ndv.getOutputSearchInput()).toHaveValue('US');
	});

	test('Should render xml and html tags as strings and can search', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_xml_output.json');
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);
		await n8n.canvas.openNode('Edit Fields');

		await expect(n8n.ndv.getOutputPanel().locator('[class*="active"]')).toContainText('Table');

		await expect(n8n.ndv.getOutputTableRow(1)).toContainText(
			'<?xml version="1.0" encoding="UTF-8"?> <library>',
		);

		await n8n.page.keyboard.press('/');

		const searchInput = n8n.ndv.getOutputSearchInput();
		await expect(searchInput).toBeFocused();
		await searchInput.fill('<lib');

		await expect(n8n.ndv.getOutputTableRow(1).locator('mark')).toContainText('<lib');

		await n8n.ndv.switchOutputMode('JSON');

		await expect(n8n.ndv.getOutputDataContainer().locator('.json-data')).toBeVisible();
	});
});
