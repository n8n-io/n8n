import { E2E_TEST_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Resource Mapper',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(E2E_TEST_NODE_NAME, { action: 'Resource Mapping Component' });
		});

		test('should not retrieve list options when required params throw errors', async ({ n8n }) => {
			const fieldsContainer = n8n.ndv.getResourceMapperFieldsContainer();
			await expect(fieldsContainer).toBeVisible();
			await expect(n8n.ndv.getResourceMapperParameterInputs()).toHaveCount(3);

			await n8n.ndv.activateParameterExpressionEditor('fieldId');
			await n8n.ndv.typeInExpressionEditor("{{ $('unknown')");
			await expect(n8n.ndv.getInlineExpressionEditorPreview()).toContainText("node doesn't exist");

			await n8n.ndv.refreshResourceMapperColumns();

			await expect(n8n.ndv.getResourceMapperFieldsContainer()).toHaveCount(0);
		});

		test('should retrieve list options when optional params throw errors', async ({ n8n }) => {
			await n8n.ndv.activateParameterExpressionEditor('otherField');
			await n8n.ndv.typeInExpressionEditor("{{ $('unknown')");
			await expect(n8n.ndv.getInlineExpressionEditorPreview()).toContainText("node doesn't exist");

			await n8n.ndv.refreshResourceMapperColumns();

			await expect(n8n.ndv.getResourceMapperFieldsContainer()).toBeVisible();
			await expect(n8n.ndv.getResourceMapperParameterInputs()).toHaveCount(3);
		});

		test('should correctly delete single field', async ({ n8n }) => {
			await n8n.ndv.fillParameterInputByName('id', '001');
			await n8n.ndv.fillParameterInputByName('name', 'John');
			await n8n.ndv.fillParameterInputByName('age', '30');
			await n8n.ndv.execute();

			await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'id' })).toBeVisible();
			await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'name' })).toBeVisible();
			await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'age' })).toBeVisible();

			await n8n.ndv.getResourceMapperRemoveFieldButton('name').click();
			await n8n.ndv.execute();

			await expect(n8n.ndv.getParameterInput('id')).toBeVisible();
			await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'id' })).toBeVisible();
			await expect(n8n.ndv.getParameterInput('age')).toBeVisible();
			await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'age' })).toBeVisible();
			await expect(n8n.ndv.getParameterInput('name')).toHaveCount(0);
			await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'name' })).toHaveCount(
				0,
			);
		});

		test('should correctly delete all fields', async ({ n8n }) => {
			await n8n.ndv.fillParameterInputByName('id', '001');
			await n8n.ndv.fillParameterInputByName('name', 'John');
			await n8n.ndv.fillParameterInputByName('age', '30');
			await n8n.ndv.execute();

			await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'id' })).toBeVisible();
			await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'name' })).toBeVisible();
			await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'age' })).toBeVisible();

			await n8n.ndv.getResourceMapperColumnsOptionsButton().click();
			await n8n.ndv.getResourceMapperRemoveAllFieldsOption().click();
			await n8n.ndv.execute();

			await expect(n8n.ndv.getParameterInput('id')).toBeVisible();
			await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'id' })).toBeVisible();
			await expect(n8n.ndv.getParameterInput('name')).toHaveCount(0);
			await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'name' })).toHaveCount(
				0,
			);
			await expect(n8n.ndv.getParameterInput('age')).toHaveCount(0);
			await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'age' })).toHaveCount(0);
		});
	},
);

test.describe(
	'Resource Mapper values persistence during node navigation',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should preserve resource mapper values when navigating between connected nodes via floating nodes', async ({
			n8n,
		}) => {
			await n8n.start.fromBlankCanvas();

			// Add first E2E Test node with Resource Mapping Component
			await n8n.canvas.addNode(E2E_TEST_NODE_NAME, {
				action: 'Resource Mapping Component',
			});

			// Set a unique fieldId so dependentParametersValues differs between nodes
			await n8n.ndv.fillParameterInputByName('fieldId', 'table1');

			// Wait for resource mapper fields to reload after fieldId change
			await expect(n8n.ndv.getResourceMapperParameterInputs()).toHaveCount(3);

			// Fill resource mapper values on first node
			await n8n.ndv.fillParameterInputByName('id', '001');
			await n8n.ndv.fillParameterInputByName('name', 'John');

			// Close NDV
			await n8n.ndv.close();

			// Add second E2E Test node connected from the first
			await n8n.canvas.addNode(E2E_TEST_NODE_NAME, {
				action: 'Resource Mapping Component',
				fromNode: 'E2E Test',
			});

			// Set a different fieldId to trigger dependentParametersValues change on navigation
			await n8n.ndv.fillParameterInputByName('fieldId', 'table2');

			// Wait for resource mapper fields to reload
			await expect(n8n.ndv.getResourceMapperParameterInputs()).toHaveCount(3);

			// Fill resource mapper values on second node
			await n8n.ndv.fillParameterInputByName('id', '002');
			await n8n.ndv.fillParameterInputByName('name', 'Jane');

			// Navigate to previous node (first E2E Test) using floating node navigation
			await n8n.ndv.clickFloatingNodeByPosition('inputMain');

			// Wait for navigation to complete by checking node-specific field value
			await expect(n8n.ndv.getParameterInputField('fieldId')).toHaveValue('table1');
			await expect(n8n.ndv.getResourceMapperParameterInputs()).toHaveCount(3);

			// Verify first node's resource mapper values are preserved
			await expect(n8n.ndv.getParameterInputField('id')).toHaveValue('001');
			await expect(n8n.ndv.getParameterInputField('name')).toHaveValue('John');

			// Navigate to next node (second E2E Test)
			await n8n.ndv.clickFloatingNodeByPosition('outputMain');

			// Wait for navigation to complete by checking node-specific field value
			await expect(n8n.ndv.getParameterInputField('fieldId')).toHaveValue('table2');
			await expect(n8n.ndv.getResourceMapperParameterInputs()).toHaveCount(3);

			// Verify second node's resource mapper values are preserved
			await expect(n8n.ndv.getParameterInputField('id')).toHaveValue('002');
			await expect(n8n.ndv.getParameterInputField('name')).toHaveValue('Jane');
		});
	},
);
