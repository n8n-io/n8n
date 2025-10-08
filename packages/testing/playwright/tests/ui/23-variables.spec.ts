import { customAlphabet } from 'nanoid';

import { test, expect } from '../../fixtures/base';

const generateValidId = customAlphabet(
	'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_',
	8,
);

test.describe('Variables', () => {
	// These tests are serial since it's at an instance level and they interact with the same variables
	test.describe.configure({ mode: 'serial' });
	test.describe('unlicensed', () => {
		test('should show the unlicensed action box when the feature is disabled', async ({ n8n }) => {
			await n8n.api.disableFeature('variables');
			await n8n.navigate.toVariables();
			await expect(n8n.variables.getUnavailableResourcesList()).toBeVisible();
			await expect(n8n.variables.getResourcesList()).toBeHidden();
		});
	});

	test.describe('licensed', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.api.enableFeature('variables');
			await n8n.api.variables.deleteAllVariables();
			await n8n.navigate.toVariables();
		});

		test('should create a new variable using empty state', async ({ n8n }) => {
			const key = `ENV_VAR_${generateValidId()}`;
			const value = 'test_value';

			await n8n.variables.createVariableFromEmptyState(key, value);

			const variableRow = n8n.variables.getVariableRow(key);
			await expect(variableRow).toContainText(value);
			await expect(variableRow).toBeVisible();
			await expect(n8n.variables.getVariablesRows()).toHaveCount(1);
		});

		test('should create multiple variables', async ({ n8n }) => {
			const key1 = `ENV_VAR_NEW_${generateValidId()}`;
			const value1 = 'test_value_1';
			await n8n.variables.createVariableFromEmptyState(key1, value1);
			await expect(n8n.variables.getVariablesRows()).toHaveCount(1);

			const key2 = `ENV_EXAMPLE_${generateValidId()}`;
			const value2 = 'test_value_2';
			await n8n.variables.createVariable(key2, value2);

			await expect(n8n.variables.getVariablesRows()).toHaveCount(2);

			const variableRow1 = n8n.variables.getVariableRow(key1);
			await expect(variableRow1).toContainText(value1);
			await expect(variableRow1).toBeVisible();

			const variableRow2 = n8n.variables.getVariableRow(key2);
			await expect(variableRow2).toContainText(value2);
			await expect(variableRow2).toBeVisible();
		});

		test('should get validation errors and cancel variable creation', async ({ n8n }) => {
			await n8n.variables.createVariableFromEmptyState(
				`ENV_BASE_${generateValidId()}`,
				'base_value',
			);
			const initialCount = await n8n.variables.getVariablesRows().count();

			const key = `ENV_VAR_INVALID_${generateValidId()}$`; // Invalid key with special character
			const value = 'test_value';

			await n8n.variables.getCreateVariableButton().click();
			const editingRow = n8n.variables.getVariablesEditableRows().first();
			await n8n.variables.setRowValue(editingRow, 'key', key);
			await n8n.variables.setRowValue(editingRow, 'value', value);
			await n8n.variables.saveRowEditing(editingRow);

			await expect(editingRow).toContainText(
				'This field may contain only letters, numbers, and underscores',
			);

			await n8n.variables.cancelRowEditing(editingRow);
			await expect(n8n.variables.getVariablesRows()).toHaveCount(initialCount);
		});

		test('should edit a variable', async ({ n8n }) => {
			const key = `ENV_VAR_EDIT_${generateValidId()}`;
			const initialValue = 'initial_value';
			await n8n.variables.createVariableFromEmptyState(key, initialValue);

			const newValue = 'updated_value';

			await n8n.variables.editRow(key);
			const editingRow = n8n.variables.getVariablesEditableRows().first();
			await n8n.variables.setRowValue(editingRow, 'value', newValue);
			await n8n.variables.saveRowEditing(editingRow);

			const variableRow = n8n.variables.getVariableRow(key);
			await expect(variableRow).toContainText(newValue);
			await expect(variableRow).toBeVisible();
		});

		test('should delete a variable', async ({ n8n }) => {
			const key = `TO_DELETE_${generateValidId()}`;
			const value = 'delete_test_value';

			await n8n.variables.createVariableFromEmptyState(key, value);
			const initialCount = await n8n.variables.getVariablesRows().count();

			await n8n.variables.deleteVariable(key);

			await expect(n8n.variables.getVariablesRows()).toHaveCount(initialCount - 1);

			await expect(n8n.variables.getVariableRow(key)).toBeHidden();
		});

		test('should search for a variable', async ({ n8n }) => {
			const uniqueId = generateValidId();

			const key1 = `SEARCH_VAR_${uniqueId}`;
			const key2 = `SEARCH_VAR_NEW_${uniqueId}`;
			const key3 = `SEARCH_EXAMPLE_${uniqueId}`;

			await n8n.variables.createVariableFromEmptyState(key1, 'search_value_1');
			await n8n.variables.createVariable(key2, 'search_value_2');
			await n8n.variables.createVariable(key3, 'search_value_3');

			await n8n.variables.getSearchBar().fill('NEW_');
			await n8n.variables.getSearchBar().press('Enter');
			await expect(n8n.variables.getVariablesRows()).toHaveCount(1);
			await expect(n8n.variables.getVariableRow(key2)).toBeVisible();
			await expect(n8n.page).toHaveURL(new RegExp('search=NEW_'));

			await n8n.variables.getSearchBar().clear();
			await n8n.variables.getSearchBar().fill('SEARCH_VAR_');
			await n8n.variables.getSearchBar().press('Enter');
			await expect(n8n.variables.getVariablesRows()).toHaveCount(2);
			await expect(n8n.variables.getVariableRow(key1)).toBeVisible();
			await expect(n8n.variables.getVariableRow(key2)).toBeVisible();
			await expect(n8n.page).toHaveURL(new RegExp('search=SEARCH_VAR_'));

			await n8n.variables.getSearchBar().clear();
			await n8n.variables.getSearchBar().fill('SEARCH_');
			await n8n.variables.getSearchBar().press('Enter');
			await expect(n8n.variables.getVariablesRows()).toHaveCount(3);
			await expect(n8n.variables.getVariableRow(key1)).toBeVisible();
			await expect(n8n.variables.getVariableRow(key2)).toBeVisible();
			await expect(n8n.variables.getVariableRow(key3)).toBeVisible();
			await expect(n8n.page).toHaveURL(new RegExp('search=SEARCH_'));

			await n8n.variables.getSearchBar().clear();
			await n8n.variables.getSearchBar().fill(`NonExistent_${generateValidId()}`);
			await n8n.variables.getSearchBar().press('Enter');
			await expect(n8n.variables.getVariablesRows()).toBeHidden();
			await expect(n8n.page).toHaveURL(/search=NonExistent_/);

			await expect(n8n.page.getByText('No variables found')).toBeVisible();
		});
	});
});
