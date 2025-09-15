import {
	CODE_NODE_NAME,
	CODE_NODE_DISPLAY_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
} from '../../config/constants';
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
		await expect(n8n.ndv.inputPanel.get()).toContainText('Wire me up');
	});

	test('should test webhook node', async ({ n8n }) => {
		await n8n.canvas.addNode('Webhook', { closeNDV: false });

		await n8n.ndv.execute();

		const webhookUrl = await n8n.ndv.getWebhookUrl();
		await expect(n8n.ndv.getWebhookTriggerListening()).toBeVisible();
		const response = await n8n.ndv.makeWebhookRequest(webhookUrl as string);
		expect(response.status()).toBe(200);

		await expect(n8n.ndv.outputPanel.get()).toBeVisible();
		await expect(n8n.ndv.outputPanel.getDataContainer()).toBeVisible();
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
			await n8n.ndv.outputPanel.switchDisplayMode('schema');

			for (const key of schemaKeys) {
				await expect(n8n.ndv.outputPanel.getSchemaItem(key)).toBeVisible();
			}
		});

		test('should preserve schema view after execution', async ({ n8n }) => {
			await setupSchemaWorkflow(n8n);
			await n8n.ndv.outputPanel.switchDisplayMode('schema');
			await n8n.ndv.execute();

			for (const key of schemaKeys) {
				await expect(n8n.ndv.outputPanel.getSchemaItem(key)).toBeVisible();
			}
		});

		test('should collapse and expand nested schema object', async ({ n8n }) => {
			await setupSchemaWorkflow(n8n);
			const expandedObjectProps = ['prop1', 'prop2'];

			await n8n.ndv.outputPanel.switchDisplayMode('schema');

			for (const key of expandedObjectProps) {
				await expect(n8n.ndv.outputPanel.getSchemaItem(key)).toBeVisible();
			}

			const objectValueItem = n8n.ndv.outputPanel.getSchemaItem('objectValue');
			await objectValueItem.locator('.toggle').click();

			for (const key of expandedObjectProps) {
				await expect(n8n.ndv.outputPanel.getSchemaItem(key)).not.toBeInViewport();
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

			await expect(n8n.ndv.outputPanel.get().getByText('5 items')).toBeVisible();

			await n8n.ndv.outputPanel.switchDisplayMode('schema');

			const schemaItemsCount = await n8n.ndv.outputPanel.getSchemaItems().count();
			expect(schemaItemsCount).toBeGreaterThan(0);

			await n8n.ndv.outputPanel.switchDisplayMode('json');
		});

		test('should display large schema', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_schema_test_pinned_data.json');
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.openNode('Set');

			await expect(n8n.ndv.outputPanel.get().getByText('20 items')).toBeVisible();
			await expect(n8n.ndv.outputPanel.get().locator('[class*="_pagination"]')).toBeVisible();

			await n8n.ndv.outputPanel.switchDisplayMode('schema');

			await expect(n8n.ndv.outputPanel.get().locator('[class*="_pagination"]')).toBeHidden();
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
		await expect(n8n.ndv.outputPanel.get()).toBeVisible();

		await n8n.ndv.searchOutputData('US');

		await expect(n8n.ndv.outputPanel.getTableRow(1).locator('mark')).toContainText('US');

		await n8n.ndv.execute();

		await expect(n8n.ndv.outputPanel.getSearchInput()).toBeVisible();
		await expect(n8n.ndv.outputPanel.getSearchInput()).toHaveValue('US');
	});

	test('Should render xml and html tags as strings and can search', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_xml_output.json');
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);
		await n8n.canvas.openNode('Edit Fields');

		await expect(n8n.ndv.outputPanel.get().locator('[class*="active"]')).toContainText('Table');

		await expect(n8n.ndv.outputPanel.getTableRow(1)).toContainText(
			'<?xml version="1.0" encoding="UTF-8"?> <library>',
		);

		await n8n.page.keyboard.press('/');

		const searchInput = n8n.ndv.outputPanel.getSearchInput();
		await expect(searchInput).toBeFocused();
		await searchInput.fill('<lib');

		await expect(n8n.ndv.outputPanel.getTableRow(1).locator('mark')).toContainText('<lib');

		await n8n.ndv.outputPanel.switchDisplayMode('json');

		await expect(n8n.ndv.outputPanel.getDataContainer().locator('.json-data')).toBeVisible();
	});

	test.describe('Run Data & Selectors - Advanced', () => {
		test('can link and unlink run selectors between input and output', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_5.json');
			await n8n.canvas.clickZoomToFitButton();
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
			await n8n.canvas.openNode('Set3');

			await n8n.ndv.inputPanel.switchDisplayMode('table');
			await n8n.ndv.outputPanel.switchDisplayMode('table');

			await n8n.ndv.ensureOutputRunLinking(true);
			await n8n.ndv.inputPanel.getTbodyCell(0, 0).click();
			expect(await n8n.ndv.getInputRunSelectorValue()).toContain('2 of 2 (6 items)');
			expect(await n8n.ndv.getOutputRunSelectorValue()).toContain('2 of 2 (6 items)');

			await n8n.ndv.changeOutputRunSelector('1 of 2 (6 items)');
			expect(await n8n.ndv.getInputRunSelectorValue()).toContain('1 of 2 (6 items)');
			await expect(n8n.ndv.inputPanel.getTbodyCell(0, 0)).toHaveText('1111');
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toHaveText('1111');

			await n8n.ndv.inputPanel.getTbodyCell(0, 0).click();
			await n8n.ndv.changeInputRunSelector('2 of 2 (6 items)');
			expect(await n8n.ndv.getOutputRunSelectorValue()).toContain('2 of 2 (6 items)');

			await n8n.ndv.outputPanel.getLinkRun().click();
			await n8n.ndv.inputPanel.getTbodyCell(0, 0).click();
			await n8n.ndv.changeOutputRunSelector('1 of 2 (6 items)');
			expect(await n8n.ndv.getInputRunSelectorValue()).toContain('2 of 2 (6 items)');

			await n8n.ndv.outputPanel.getLinkRun().click();
			await n8n.ndv.inputPanel.getTbodyCell(0, 0).click();
			expect(await n8n.ndv.getInputRunSelectorValue()).toContain('1 of 2 (6 items)');

			await n8n.ndv.inputPanel.toggleInputRunLinking();
			await n8n.ndv.inputPanel.getTbodyCell(0, 0).click();
			await n8n.ndv.changeInputRunSelector('2 of 2 (6 items)');
			expect(await n8n.ndv.getOutputRunSelectorValue()).toContain('1 of 2 (6 items)');

			await n8n.ndv.inputPanel.toggleInputRunLinking();
			await n8n.ndv.inputPanel.getTbodyCell(0, 0).click();
			expect(await n8n.ndv.getOutputRunSelectorValue()).toContain('2 of 2 (6 items)');
		});
	});

	test.describe('Remote Options & Network', () => {
		test('should not retrieve remote options when a parameter value changes', async ({ n8n }) => {
			let fetchParameterOptionsCallCount = 0;
			await n8n.page.route('**/rest/dynamic-node-parameters/options', async (route) => {
				fetchParameterOptionsCallCount++;
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ data: [] }),
				});
			});

			await n8n.canvas.addNode('E2E Test', { action: 'Remote Options' });
			await expect(n8n.ndv.getContainer()).toBeVisible();

			await n8n.ndv.fillFirstAvailableTextParameterMultipleTimes(['test1', 'test2', 'test3']);

			expect(fetchParameterOptionsCallCount).toBe(1);
		});

		test('Should show a notice when remote options cannot be fetched because of missing credentials', async ({
			n8n,
		}) => {
			await n8n.page.route('**/rest/dynamic-node-parameters/options', async (route) => {
				await route.fulfill({ status: 403 });
			});

			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Notion', { action: 'Update a database page', closeNDV: false });
			await expect(n8n.ndv.getContainer()).toBeVisible();

			await n8n.ndv.addItemToFixedCollection('propertiesUi');
			await expect(
				n8n.ndv.getParameterInputWithIssues('propertiesUi.propertyValues[0].key'),
			).toBeVisible();
		});

		test('Should show error state when remote options cannot be fetched', async ({ n8n }) => {
			await n8n.page.route('**/rest/dynamic-node-parameters/options', async (route) => {
				await route.fulfill({ status: 500 });
			});

			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Notion', { action: 'Update a database page', closeNDV: false });
			await expect(n8n.ndv.getContainer()).toBeVisible();

			await n8n.credentialsComposer.createFromNdv({
				apiKey: 'sk_test_123',
			});
			await n8n.ndv.addItemToFixedCollection('propertiesUi');
			await expect(
				n8n.ndv.getParameterInputWithIssues('propertiesUi.propertyValues[0].key'),
			).toBeVisible();
		});
	});

	test.describe('Floating Nodes Navigation', () => {
		test('should traverse floating nodes with mouse', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Floating_Nodes.json');
			await n8n.canvas.getCanvasNodes().first().dblclick();
			await expect(n8n.ndv.getContainer()).toBeVisible();

			await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeHidden();
			await expect(n8n.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();
			for (let i = 0; i < 4; i++) {
				await n8n.ndv.clickFloatingNodeByPosition('outputMain');
				await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();
				await expect(n8n.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();

				await n8n.ndv.close();
				await expect(n8n.canvas.getSelectedNodes()).toHaveCount(1);

				await n8n.canvas.getSelectedNodes().first().dblclick();
				await expect(n8n.ndv.getContainer()).toBeVisible();
			}

			await n8n.ndv.clickFloatingNodeByPosition('outputMain');
			await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();

			for (let i = 0; i < 4; i++) {
				await n8n.ndv.clickFloatingNodeByPosition('inputMain');
				await expect(n8n.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();
				await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();
			}

			await n8n.ndv.clickFloatingNodeByPosition('inputMain');
			await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeHidden();
			await expect(n8n.ndv.getFloatingNodeByPosition('inputSub')).toBeHidden();
			await expect(n8n.ndv.getFloatingNodeByPosition('outputSub')).toBeHidden();

			await n8n.ndv.close();
			await expect(n8n.canvas.getSelectedNodes()).toHaveCount(1);
		});

		test('should traverse floating nodes with keyboard', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Floating_Nodes.json');

			await n8n.canvas.getCanvasNodes().first().dblclick();
			await expect(n8n.ndv.getContainer()).toBeVisible();

			await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeHidden();
			await expect(n8n.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();
			for (let i = 0; i < 4; i++) {
				await n8n.ndv.navigateToNextFloatingNodeWithKeyboard();
				await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();
				await expect(n8n.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();

				await n8n.ndv.close();
				await expect(n8n.canvas.getSelectedNodes()).toHaveCount(1);

				await n8n.canvas.getSelectedNodes().first().dblclick();
				await expect(n8n.ndv.getContainer()).toBeVisible();
			}

			await n8n.ndv.navigateToNextFloatingNodeWithKeyboard();
			await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();

			for (let i = 0; i < 4; i++) {
				await n8n.ndv.navigateToPreviousFloatingNodeWithKeyboard();
				await expect(n8n.ndv.getFloatingNodeByPosition('outputMain')).toBeVisible();
				await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeVisible();
			}

			await n8n.ndv.navigateToPreviousFloatingNodeWithKeyboard();
			await expect(n8n.ndv.getFloatingNodeByPosition('inputMain')).toBeHidden();
			await expect(n8n.ndv.getFloatingNodeByPosition('inputSub')).toBeHidden();
			await expect(n8n.ndv.getFloatingNodeByPosition('outputSub')).toBeHidden();

			await n8n.ndv.close();
			await expect(n8n.canvas.getSelectedNodes()).toHaveCount(1);
		});

		test('should connect floating sub-nodes', async ({ n8n }) => {
			await n8n.canvas.addNode('AI Agent', { closeNDV: false });
			await expect(n8n.ndv.getContainer()).toBeVisible();

			await n8n.ndv.connectAISubNode('ai_languageModel', 'Anthropic Chat Model');
			await n8n.ndv.connectAISubNode('ai_memory', 'Simple Memory');
			await n8n.ndv.connectAISubNode('ai_tool', 'HTTP Request Tool');

			expect(await n8n.ndv.getNodesWithIssuesCount()).toBeGreaterThanOrEqual(2);
		});

		test('should have the floating nodes in correct order', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Floating_Nodes.json');

			await n8n.canvas.openNode('Merge');
			await expect(n8n.ndv.getContainer()).toBeVisible();

			expect(await n8n.ndv.getFloatingNodeCount('inputMain')).toBe(2);
			await n8n.ndv.verifyFloatingNodeName('inputMain', 'Edit Fields1', 0);
			await n8n.ndv.verifyFloatingNodeName('inputMain', 'Edit Fields0', 1);

			await n8n.ndv.close();

			await n8n.canvas.openNode('Merge1');
			await expect(n8n.ndv.getContainer()).toBeVisible();

			expect(await n8n.ndv.getFloatingNodeCount('inputMain')).toBe(2);
			await n8n.ndv.verifyFloatingNodeName('inputMain', 'Edit Fields0', 0);
			await n8n.ndv.verifyFloatingNodeName('inputMain', 'Edit Fields1', 1);
		});
	});

	test.describe('Parameter Management - Advanced', () => {
		test('Should clear mismatched collection parameters', async ({ n8n }) => {
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Notion', { action: 'Create a database page', closeNDV: false });
			await expect(n8n.ndv.getContainer()).toBeVisible();

			await n8n.ndv.addItemToFixedCollection('propertiesUi');
			await n8n.ndv.changeNodeOperation('Update');

			await expect(n8n.ndv.getParameterItemWithText('Currently no items exist')).toBeVisible();
		});

		test('Should keep RLC values after operation change', async ({ n8n }) => {
			const TEST_DOC_ID = '1111';

			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Google Sheets', { closeNDV: false, action: 'Append row in sheet' });
			await expect(n8n.ndv.getContainer()).toBeVisible();

			await n8n.ndv.setRLCValue('documentId', TEST_DOC_ID);
			await n8n.ndv.changeNodeOperation('Append or Update Row');
			const input = n8n.ndv.getResourceLocatorInput('documentId').locator('input');
			await expect(input).toHaveValue(TEST_DOC_ID);
		});

		test('Should not clear resource/operation after credential change', async ({ n8n }) => {
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Discord', { closeNDV: false, action: 'Delete a message' });
			await expect(n8n.ndv.getContainer()).toBeVisible();
			await n8n.credentialsComposer.createFromNdv({
				botToken: 'sk_test_123',
			});

			const resourceInput = n8n.ndv.getParameterInputField('resource');
			const operationInput = n8n.ndv.getParameterInputField('operation');

			await expect(resourceInput).toHaveValue('Message');
			await expect(operationInput).toHaveValue('Delete');
		});
	});

	test.describe('Node Creator Integration', () => {
		test('Should open appropriate node creator after clicking on connection hint link', async ({
			n8n,
		}) => {
			const hintMapper = {
				Memory: 'AI Nodes',
				'Output Parser': 'AI Nodes',
				'Token Splitter': 'Document Loaders',
				Tool: 'AI Nodes',
				Embeddings: 'Vector Stores',
				'Vector Store': 'Retrievers',
			};

			await n8n.canvas.importWorkflow(
				'open_node_creator_for_connection.json',
				'open_node_creator_for_connection',
			);

			for (const [node, group] of Object.entries(hintMapper)) {
				await n8n.canvas.openNode(node);

				await n8n.ndv.clickNodeCreatorInsertOneButton();
				await expect(n8n.canvas.getNodeCreatorHeader(group)).toBeVisible();
				await n8n.page.keyboard.press('Escape');
			}
		});
	});

	test.describe('Expression Editor Features', () => {
		test('should allow selecting item for expressions', async ({ n8n }) => {
			await n8n.canvas.importWorkflow('Test_workflow_3.json', 'My test workflow 2');

			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await n8n.canvas.openNode('Set');

			await n8n.ndv.getAssignmentValue('assignments').getByText('Expression').click();

			const expressionInput = n8n.ndv.getInlineExpressionEditorInput();
			await expressionInput.click();
			await n8n.ndv.clearExpressionEditor();
			await n8n.ndv.typeInExpressionEditor('{{ $json.input[0].count');

			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('0');

			await n8n.ndv.expressionSelectNextItem();
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('1');
			await expect(n8n.ndv.getInlineExpressionEditorItemInput()).toHaveValue('1');

			await expect(n8n.ndv.getInlineExpressionEditorItemNextButton()).toBeDisabled();

			await n8n.ndv.expressionSelectPrevItem();
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('0');
			await expect(n8n.ndv.getInlineExpressionEditorItemInput()).toHaveValue('0');
		});
	});

	test.describe('Schema & Data Views', () => {
		test('should show data from the correct output in schema view', async ({ n8n }) => {
			await n8n.canvas.importWorkflow('Test_workflow_multiple_outputs.json', 'Multiple outputs');
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await n8n.canvas.openNode('Only Item 1');
			await expect(n8n.ndv.inputPanel.get()).toBeVisible();
			await n8n.ndv.inputPanel.switchDisplayMode('schema');
			await expect(n8n.ndv.inputPanel.getSchemaItem('onlyOnItem1')).toBeVisible();
			await n8n.ndv.close();

			await n8n.canvas.openNode('Only Item 2');
			await expect(n8n.ndv.inputPanel.get()).toBeVisible();
			await n8n.ndv.inputPanel.switchDisplayMode('schema');
			await expect(n8n.ndv.inputPanel.getSchemaItem('onlyOnItem2')).toBeVisible();
			await n8n.ndv.close();

			await n8n.canvas.openNode('Only Item 3');
			await expect(n8n.ndv.inputPanel.get()).toBeVisible();
			await n8n.ndv.inputPanel.switchDisplayMode('schema');
			await expect(n8n.ndv.inputPanel.getSchemaItem('onlyOnItem3')).toBeVisible();
			await n8n.ndv.close();
		});
	});

	test.describe('Search Functionality - Advanced', () => {
		test('should not show items count when searching in schema view', async ({ n8n }) => {
			await n8n.canvas.importWorkflow('Test_ndv_search.json', 'NDV Search Test');
			await n8n.canvas.openNode('Edit Fields');
			await expect(n8n.ndv.outputPanel.get()).toBeVisible();

			await n8n.ndv.execute();
			await n8n.ndv.outputPanel.switchDisplayMode('schema');
			await n8n.ndv.searchOutputData('US');

			await expect(n8n.ndv.outputPanel.getItemsCount()).toBeHidden();
		});

		test('should show additional tooltip when searching in schema view if no matches', async ({
			n8n,
		}) => {
			await n8n.canvas.importWorkflow('Test_ndv_search.json', 'NDV Search Test');

			await n8n.canvas.openNode('Edit Fields');
			await expect(n8n.ndv.outputPanel.get()).toBeVisible();

			await n8n.ndv.execute();
			await n8n.ndv.outputPanel.switchDisplayMode('schema');
			await n8n.ndv.searchOutputData('foo');

			await expect(
				n8n.ndv.outputPanel
					.get()
					.getByText('To search field values, switch to table or JSON view.'),
			).toBeVisible();
		});
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
