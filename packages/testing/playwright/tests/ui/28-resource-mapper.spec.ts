import { E2E_TEST_NODE_NAME } from '../../config/constants';
import { test, expect } from '../../fixtures/base';

test.describe('Resource Mapper', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.addResource.workflow();
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
		await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'name' })).toHaveCount(0);
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
		await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'name' })).toHaveCount(0);
		await expect(n8n.ndv.getParameterInput('age')).toHaveCount(0);
		await expect(n8n.ndv.outputPanel.getTableHeaders().filter({ hasText: 'age' })).toHaveCount(0);
	});
});
