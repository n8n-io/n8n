import { test, expect } from '../../../fixtures/base';
import { EDIT_FIELDS_SET_NODE_NAME, MANUAL_TRIGGER_NODE_NAME } from '../../../config/constants';

test.describe(
	'N8N-9898: Multiple expressions in single field',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test('should validate and auto-complete second expression in field with multiple expressions', async ({
			n8n,
		}) => {
			// Setup: Create a workflow with data to reference
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.ndv.setPinnedData([
				{
					source_url: 'https://community.n8n.io/t/130345',
					title: 'Test Title',
				},
			]);
			await n8n.ndv.close();

			// Add Edit Fields node
			await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME);
			await n8n.ndv.getAssignmentCollectionAdd('assignments').click();

			// Set field name
			await n8n.ndv.fillParameterInputByName('name', 'forum_line');

			// Switch to expression mode for value field
			await n8n.ndv.getParameterInputField('value').clear();
			await n8n.ndv.getParameterInputField('value').fill('=');

			// Type a value with multiple expressions
			// Similar to the bug report: <li><a href="{{ $('Limit').item.json.source_url }}">{{ json.title }}
			const expressionText = '<li><a href="{{ $json.source_url }}">{{ $json.title }}';
			await n8n.ndv.getInlineExpressionEditorContent().fill(expressionText);

			// Click outside to trigger validation
			await n8n.ndv.getParameterInputField('name').click();

			// Get the preview/result
			const previewValue = await n8n.ndv.getParameterExpressionPreviewValue().textContent();

			// The bug: second expression shows [invalid syntax]
			// Expected: both expressions should resolve correctly
			// This test should FAIL until the bug is fixed
			expect(previewValue).not.toContain('[invalid syntax]');
			expect(previewValue).toContain('https://community.n8n.io/t/130345');
			expect(previewValue).toContain('Test Title');
		});

		test('should handle multiple expressions with text in between', async ({ n8n }) => {
			// Setup
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.ndv.setPinnedData([{ firstName: 'John', lastName: 'Doe' }]);
			await n8n.ndv.close();

			await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME);
			await n8n.ndv.getAssignmentCollectionAdd('assignments').click();

			// Set field name
			await n8n.ndv.fillParameterInputByName('name', 'fullName');

			// Switch to expression mode
			await n8n.ndv.getParameterInputField('value').clear();
			await n8n.ndv.getParameterInputField('value').fill('=');

			// Type multiple expressions with text between them
			const expressionText = 'Name: {{ $json.firstName }} {{ $json.lastName }}';
			await n8n.ndv.getInlineExpressionEditorContent().fill(expressionText);

			// Trigger validation
			await n8n.ndv.getParameterInputField('name').click();

			// Verify result
			const previewValue = await n8n.ndv.getParameterExpressionPreviewValue().textContent();

			// Should not show invalid syntax for any expression
			expect(previewValue).not.toContain('[invalid syntax]');
			expect(previewValue).toContain('John');
			expect(previewValue).toContain('Doe');
		});

		test('should validate inline expression editor output for multiple expressions', async ({
			n8n,
		}) => {
			// Setup
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.ndv.setPinnedData([{ a: 'Hello', b: 'World' }]);
			await n8n.ndv.close();

			await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME);
			await n8n.ndv.getAssignmentCollectionAdd('assignments').click();

			await n8n.ndv.fillParameterInputByName('name', 'message');

			// Activate expression mode
			await n8n.ndv.activateParameterExpressionEditor('value');

			// Clear and type first expression
			await n8n.ndv.clearExpressionEditor('value');
			await n8n.ndv.typeInExpressionEditor('{{ $json.a', 'value');

			// Verify first expression works
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('Hello');

			// Now add more text and a second expression
			await n8n.ndv.getInlineExpressionEditorInput('value').pressSequentially(' }} - {{ $json.b');

			// The inline expression output should show the resolved value of the second expression
			// This is where the bug manifests - the second expression might not be validated/resolved
			await expect(n8n.ndv.getInlineExpressionEditorOutput()).toHaveText('World');
		});

		test('should autocomplete second expression in field', async ({ n8n }) => {
			// Setup
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.ndv.setPinnedData([{ user: { name: 'Alice', age: 30 } }]);
			await n8n.ndv.close();

			await n8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME);
			await n8n.ndv.getAssignmentCollectionAdd('assignments').click();

			await n8n.ndv.fillParameterInputByName('name', 'userInfo');

			// Activate expression mode
			await n8n.ndv.activateParameterExpressionEditor('value');

			// Type first expression
			await n8n.ndv.clearExpressionEditor('value');
			await n8n.ndv.typeInExpressionEditor('{{ $json.user.name }} is {{ $json.', 'value');

			// The autocomplete should appear for the second expression
			// Wait for autocomplete dropdown to be visible
			const autocomplete = n8n.page.locator('.cm-tooltip-autocomplete');

			// This should show autocomplete suggestions
			// Bug: autocomplete might not work for second expression
			await expect(autocomplete).toBeVisible({ timeout: 3000 });

			// Autocomplete should include 'user' in suggestions
			await expect(autocomplete).toContainText('user');
		});
	},
);
