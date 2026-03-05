import { test, expect } from '../../../../../fixtures/base';

test.describe('NDV Parameters', {
	annotation: [
		{ type: 'owner', description: 'Adore' },
	],
}, () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test.describe('Parameter Hints', () => {
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
});
