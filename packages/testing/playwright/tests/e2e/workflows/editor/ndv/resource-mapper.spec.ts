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
			await n8n.ndv.setupHelper.setParameter('fieldId', 'table1');

			// Wait for resource mapper fields to reload after fieldId change
			await expect(n8n.ndv.getResourceMapperParameterInputs()).toHaveCount(3);

			// Fill resource mapper values on first node
			await n8n.ndv.fillParameterInputByName('id', '001');
			await n8n.ndv.fillParameterInputByName('name', 'John');
			await n8n.ndv.waitForDebounce();

			// Close NDV
			await n8n.ndv.close();

			// Add second E2E Test node connected from the first
			await n8n.canvas.addNode(E2E_TEST_NODE_NAME, {
				action: 'Resource Mapping Component',
				fromNode: 'E2E Test',
			});

			// Set a different fieldId to trigger dependentParametersValues change on navigation
			await n8n.ndv.setupHelper.setParameter('fieldId', 'table2');

			// Wait for resource mapper fields to reload
			await expect(n8n.ndv.getResourceMapperParameterInputs()).toHaveCount(3);

			// Fill resource mapper values on second node
			await n8n.ndv.fillParameterInputByName('id', '002');
			await n8n.ndv.fillParameterInputByName('name', 'Jane');
			await n8n.ndv.waitForDebounce();

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

test.describe(
	'Resource Mapper field deletion persistence (GHC-8230)',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should persist field deletion after closing and reopening NDV', async ({ n8n }) => {
			// GHC-8230: Deleting a mapped column in Google Sheets node doesn't trigger workflow save
			// This test verifies that when a user deletes a column mapping, the change is saved
			// and persists when the node is reopened
			await n8n.start.fromBlankCanvas();

			// Add Google Sheets node with "Append or Update Row" operation
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Google Sheets', {
				action: 'Append or Update Row',
				closeNDV: false,
			});

			// Set up the node with Map Each Column Manually mode
			// The resourceMapper should already be visible for v4+ of Google Sheets node
			await expect(n8n.ndv.getResourceMapperFieldsContainer()).toBeVisible();

			// Fill in multiple column mappings as described in the bug report
			await n8n.ndv.fillParameterInputByName('test1', '1');
			await n8n.ndv.fillParameterInputByName('test2', '2');
			await n8n.ndv.fillParameterInputByName('test3', '3');

			// Wait for auto-save to complete
			await n8n.canvas.waitForSaveWorkflowCompleted();

			// Verify all three fields are present
			await expect(n8n.ndv.getParameterInput('test1')).toBeVisible();
			await expect(n8n.ndv.getParameterInput('test2')).toBeVisible();
			await expect(n8n.ndv.getParameterInput('test3')).toBeVisible();

			// Delete the 'test2' field using the trash icon
			await n8n.ndv.getResourceMapperRemoveFieldButton('test2').click();

			// Verify the field is removed from the UI
			await expect(n8n.ndv.getParameterInput('test2')).toHaveCount(0);
			await expect(n8n.ndv.getParameterInput('test1')).toBeVisible();
			await expect(n8n.ndv.getParameterInput('test3')).toBeVisible();

			// BUG: The deletion should trigger a workflow save, but it doesn't
			// Wait for the save to complete (this should happen but currently doesn't due to the bug)
			await n8n.canvas.waitForSaveWorkflowCompleted({ timeout: 3000 });

			// Close the NDV
			await n8n.ndv.close();

			// Reopen the Google Sheets node
			await n8n.canvas.openNode('Google Sheets');

			// Verify the deleted field remains deleted (should be absent)
			// BUG: Currently the field reappears because the deletion wasn't saved
			await expect(n8n.ndv.getParameterInput('test2')).toHaveCount(0);
			await expect(n8n.ndv.getParameterInput('test1')).toBeVisible();
			await expect(n8n.ndv.getParameterInput('test3')).toBeVisible();
		});
	},
);
