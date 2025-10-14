import { test, expect } from '../../fixtures/base';

test.describe('Data Mapping', () => {
	test.describe
		.serial('Expression Preview', () => {
			test('maps expressions from table json, and resolves value based on hover', async ({
				n8n,
			}) => {
				// This test is marked as serial because hover/tooltips are unreliable when running in parallel against a single server due to resource contention.

				await n8n.start.fromImportedWorkflow('Test_workflow_3.json');
				await n8n.canvas.openNode('Set');
				await n8n.ndv.inputPanel.switchDisplayMode('table');

				await expect(n8n.ndv.inputPanel.getTable()).toBeVisible();

				await expect(n8n.ndv.getParameterInputField('name')).toHaveValue('other');
				await expect(n8n.ndv.getParameterInputField('value')).toHaveValue('');

				const countCell = n8n.ndv.inputPanel.getTableCellSpan(0, 0, 'count');
				await expect(countCell).toBeVisible();

				const valueParameter = n8n.ndv.getParameterInput('value');
				await n8n.interactions.precisionDragToTarget(countCell, valueParameter, 'bottom');

				await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveText(
					'{{ $json.input[0].count }}',
				);
				await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('0');

				await n8n.ndv.inputPanel.getTbodyCell(0, 0).hover();
				await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('0');

				await n8n.ndv.inputPanel.getTbodyCell(1, 0).hover();
				await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('1');

				await n8n.ndv.execute();

				await expect(n8n.ndv.outputPanel.getTable()).toBeVisible();

				await n8n.ndv.outputPanel.getTbodyCell(0, 0).hover();
				await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('0');

				await n8n.ndv.outputPanel.getTbodyCell(1, 0).hover();
				await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('1');
			});
		});
	test('maps expressions from json view', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_3.json');
		await n8n.canvas.openNode('Set');
		await n8n.ndv.inputPanel.switchDisplayMode('json');

		const expectedJsonText =
			'[{"input": [{"count": 0,"with space": "!!","with.dot": "!!","with"quotes": "!!"}]},{"input": [{"count": 1}]}]';
		await expect(n8n.ndv.inputPanel.get().getByText(expectedJsonText)).toBeVisible();

		await expect(n8n.ndv.inputPanel.getJsonDataContainer()).toBeVisible();

		const inputSpan = n8n.ndv.inputPanel.getJsonProperty('input');
		await expect(inputSpan).toBeVisible();

		const valueParameterInput = n8n.ndv.getParameterInput('value');
		await expect(valueParameterInput).toBeVisible();

		await inputSpan.dragTo(valueParameterInput);

		const expressionEditor = n8n.ndv.getInlineExpressionEditorInput();
		await expect(expressionEditor).toBeVisible();
		await expect(expressionEditor).toHaveText('{{ $json.input }}');

		await n8n.page.keyboard.press('Escape');

		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('Array:');
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('"count": 0');

		const countSpan = n8n.ndv.inputPanel.getJsonPropertyContaining('count');
		await expect(countSpan).toBeVisible();

		await n8n.interactions.precisionDragToTarget(
			countSpan,
			n8n.ndv.getInlineExpressionEditorInput(),
			'bottom',
		);

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveText(
			'{{ $json.input }}{{ $json.input[0].count }}',
		);

		await n8n.page.keyboard.press('Escape');

		const previewElement = n8n.ndv.getParameterExpressionPreviewValue();
		await expect(previewElement).toBeVisible();
	});

	test('maps expressions from previous nodes', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_3.json');
		await n8n.canvas.openNode('Set1');
		await n8n.ndv.executePrevious();

		const scheduleNode = n8n.ndv.inputPanel.get().getByText('Schedule Trigger');
		await expect(scheduleNode).toBeVisible();
		await scheduleNode.click();

		const schemaItem = n8n.ndv.inputPanel.getSchemaItemText('count');
		await expect(schemaItem).toBeVisible();

		const valueParameterInput = n8n.ndv.getParameterInput('value');
		await expect(valueParameterInput).toBeVisible();

		await n8n.interactions.precisionDragToTarget(
			schemaItem.locator('span'),
			valueParameterInput,
			'top',
		);

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveText(
			"{{ $('Schedule Trigger').item.json.input[0].count }}",
		);

		await n8n.page.keyboard.press('Escape');

		await n8n.ndv.inputPanel.switchDisplayMode('table');
		await n8n.ndv.selectInputNode('Schedule Trigger');

		const headerElement = n8n.ndv.inputPanel.getTableHeader(0);
		await expect(headerElement).toBeVisible();

		await n8n.interactions.precisionDragToTarget(
			headerElement,
			n8n.ndv.getInlineExpressionEditorInput(),
			'top',
		);

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveText(
			"{{ $('Schedule Trigger').item.json.input }}{{ $('Schedule Trigger').item.json.input[0].count }}",
		);

		await n8n.ndv.selectInputNode('Set');
	});
	test('maps expressions from table header', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow-actions_paste-data.json');
		await n8n.canvas.openNode('Set');
		await n8n.ndv.executePrevious();
		await n8n.ndv.inputPanel.switchDisplayMode('table');

		await expect(n8n.ndv.inputPanel.getTable()).toBeVisible();

		const addValueButton = n8n.ndv.getAddValueButton();
		await expect(addValueButton).toBeVisible();
		await addValueButton.click();

		await n8n.page.getByRole('option', { name: 'String' }).click();

		await expect(n8n.ndv.getParameterInputField('name')).toHaveValue('propertyName');
		await expect(n8n.ndv.getParameterInputField('value')).toHaveValue('');

		const firstHeader = n8n.ndv.inputPanel.getTableHeader(0);
		await expect(firstHeader).toBeVisible();

		const valueParameter = n8n.ndv.getParameterInput('value');
		await n8n.interactions.precisionDragToTarget(firstHeader, valueParameter, 'bottom');

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toBeVisible();
		await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveText('{{ $json.timestamp }}');

		await n8n.page.keyboard.press('Escape');

		const currentYear = new Date().getFullYear().toString();
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText(currentYear);

		const secondHeader = n8n.ndv.inputPanel.getTableHeader(1);
		await expect(secondHeader).toBeVisible();

		await n8n.interactions.precisionDragToTarget(
			secondHeader,
			n8n.ndv.getInlineExpressionEditorInput(),
			'top',
		);

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveText(
			"{{ $json['Readable date'] }}{{ $json.timestamp }}",
		);
	});

	test('maps expressions from schema view', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_3.json');
		await n8n.canvas.openNode('Set');

		await n8n.ndv.getParameterInputField('value').clear();
		await n8n.page.keyboard.press('Escape');

		const countSchemaItem = n8n.ndv.inputPanel.getSchemaItemText('count');
		await expect(countSchemaItem).toBeVisible();

		const valueParameter = n8n.ndv.getParameterInput('value');
		await n8n.interactions.precisionDragToTarget(countSchemaItem, valueParameter, 'bottom');

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveText('{{ $json.input[0].count }}');
		await n8n.page.keyboard.press('Escape');
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('0');

		const inputSchemaItem = n8n.ndv.inputPanel.getSchemaItemText('input');
		await expect(inputSchemaItem).toBeVisible();

		await n8n.interactions.precisionDragToTarget(inputSchemaItem, valueParameter, 'top');

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveText(
			'{{ $json.input }}{{ $json.input[0].count }}',
		);
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('[object Object]0');
	});

	test('maps keys to path', async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
		await n8n.canvas.addNode('Manual Trigger');
		await n8n.canvas.openNode('When clicking ‘Execute workflow’');

		await n8n.ndv.setPinnedData([
			{
				input: [
					{
						'hello.world': {
							'my count': 0,
						},
					},
				],
			},
			{
				input: [
					{
						'hello.world': {
							'my count': 1,
						},
					},
				],
			},
		]);

		await n8n.ndv.close();

		await n8n.canvas.addNode('Sort');

		const addFieldButton = n8n.ndv.getAddFieldToSortByButton();
		await addFieldButton.click();

		const myCountSpan = n8n.ndv.inputPanel.getSchemaItemText('my count');
		await expect(myCountSpan).toBeVisible();

		const fieldNameParameter = n8n.ndv.getParameterInput('fieldName');
		await n8n.interactions.precisionDragToTarget(myCountSpan, fieldNameParameter, 'bottom');

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toBeHidden();
		await expect(n8n.ndv.getParameterInputField('fieldName')).toHaveValue(
			"input[0]['hello.world']['my count']",
		);
	});

	// There is an issue here sometimes, when dragging to the target it prepends the last value that was in the window even if it was cleared
	// eslint-disable-next-line playwright/no-skipped-test
	test.skip('maps expressions to updated fields correctly', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_3.json');
		await n8n.canvas.openNode('Set');

		await n8n.ndv.fillParameterInputByName('value', 'delete me');
		await n8n.ndv.fillParameterInputByName('name', 'test');
		await n8n.ndv.getParameterInputField('name').blur();

		await n8n.ndv.fillParameterInputByName('value', 'fun');
		await n8n.ndv.getParameterInputField('value').clear();

		const countSchemaItem = n8n.ndv.inputPanel.getSchemaItemText('count');
		await expect(countSchemaItem).toBeVisible();

		const valueParameter = n8n.ndv.getParameterInput('value');
		await n8n.interactions.precisionDragToTarget(countSchemaItem, valueParameter, 'bottom');

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveText('{{ $json.input[0].count }}');
		await n8n.page.keyboard.press('Escape');
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('0');

		const inputSchemaItem = n8n.ndv.inputPanel.getSchemaItemText('input');
		await expect(inputSchemaItem).toBeVisible();

		await n8n.interactions.precisionDragToTarget(inputSchemaItem, valueParameter, 'top');

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveText(
			'{{ $json.input }}{{ $json.input[0].count }}',
		);
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('[object Object]0');
	});

	test('renders expression preview when a previous node is selected', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_3.json');
		await n8n.canvas.openNode('Set');

		await n8n.ndv.fillParameterInputByName('value', 'test_value');
		await n8n.ndv.fillParameterInputByName('name', 'test_name');
		await n8n.ndv.close();

		await n8n.canvas.openNode('Set1');
		await n8n.ndv.executePrevious();
		await n8n.ndv.inputPanel.switchDisplayMode('table');

		const firstHeader = n8n.ndv.inputPanel.getTableHeader(0);
		await expect(firstHeader).toBeVisible();

		const valueParameter = n8n.ndv.getParameterInput('value');
		await n8n.interactions.precisionDragToTarget(firstHeader, valueParameter, 'bottom');

		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('test_value');

		await n8n.ndv.selectInputNode('Schedule Trigger');
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText('test_value');
	});

	test('shows you can drop to inputs, including booleans', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_3.json');
		await n8n.canvas.openNode('Set');

		await expect(n8n.ndv.getParameterSwitch('includeOtherFields')).toBeVisible();
		await expect(n8n.ndv.getParameterTextInput('includeOtherFields')).toBeHidden();

		const countSpan = n8n.ndv.inputPanel.getSchemaItemText('count');
		await expect(countSpan).toBeVisible();

		await countSpan.hover();
		await n8n.page.mouse.down();
		await n8n.page.mouse.move(100, 100);

		await expect(n8n.ndv.getParameterSwitch('includeOtherFields')).toBeHidden();
		await expect(n8n.ndv.getParameterTextInput('includeOtherFields')).toBeVisible();

		const includeOtherFieldsInput = n8n.ndv.getParameterTextInput('includeOtherFields');
		await expect(includeOtherFieldsInput).toHaveCSS('border', /dashed.*rgb\(90, 76, 194\)/);

		const valueInput = n8n.ndv.getParameterTextInput('value');
		await expect(valueInput).toHaveCSS('border', /dashed.*rgb\(90, 76, 194\)/);

		await n8n.page.mouse.up();
	});

	test('maps expressions to a specific location in the editor', async ({ n8n }) => {
		await n8n.start.fromImportedWorkflow('Test_workflow_3.json');
		await n8n.canvas.openNode('Set');

		await n8n.ndv.fillParameterInputByName('value', '=');
		await n8n.ndv.getInlineExpressionEditorContent().fill('hello world\n\nnewline');
		await n8n.page.keyboard.press('Escape');

		const countSchemaItem = n8n.ndv.inputPanel.getSchemaItemText('count');
		await expect(countSchemaItem).toBeVisible();

		const valueParameter = n8n.ndv.getParameterInput('value');
		await n8n.interactions.precisionDragToTarget(countSchemaItem, valueParameter, 'top');

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveText(
			'{{ $json.input[0].count }}hello worldnewline',
		);
		await n8n.page.keyboard.press('Escape');
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toContainText(
			'0hello world\n\nnewline',
		);

		const inputSchemaItem = n8n.ndv.inputPanel.getSchemaItemText('input');
		await expect(inputSchemaItem).toBeVisible();

		await n8n.interactions.precisionDragToTarget(inputSchemaItem, valueParameter, 'center');

		await expect(n8n.ndv.getInlineExpressionEditorInput()).toHaveText(
			'{{ $json.input[0].count }}hello world{{ $json.input }}newline',
		);
	});
});
