import { test, expect } from '../../fixtures/base';

test.describe('Data Mapping', () => {
	test.describe('Expression Mapping', () => {
		test('maps expressions from json view', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_3.json');
			await n8n.canvas.openNode('Set');
			await n8n.ndv.switchInputMode('JSON');

			const expectedJsonText =
				'[{"input": [{"count": 0,"with space": "!!","with.dot": "!!","with"quotes": "!!"}]},{"input": [{"count": 1}]}]';
			await expect(n8n.ndv.getInputPanel().getByText(expectedJsonText)).toBeVisible();

			await expect(n8n.ndv.getJsonDataContainer()).toBeVisible();

			const inputSpan = n8n.ndv.getInputJsonProperty('input');
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

			const countSpan = n8n.ndv.getInputJsonPropertyContaining('count');
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

		test.skip('maps expressions from previous nodes', () => {});
	});

	test.describe('Data Transformation', () => {
		test.skip('handles complex expression mappings', () => {});

		test.skip('validates expression syntax and results', () => {});
	});
});
