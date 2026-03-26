import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'NDV Input Mode Switching',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test('should preserve cursor position when auto-switching from fixed to expression mode', async ({
			n8n,
		}) => {
			// Setup: Add a node with a text parameter
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Edit Fields (Set)', { closeNDV: false, action: 'Add Fields' });

			// Get the value parameter input (initially in fixed mode)
			const parameterInput = n8n.ndv.getParameterInput('value').first();
			const valueInput = parameterInput.locator('input');

			// Click to focus the input
			await valueInput.click();

			// Type text that will trigger auto-switch to expression mode
			// According to the bug report, typing "{{" triggers the switch
			await valueInput.type('hello {{', { delay: 50 });

			// Wait for the mode switch to occur
			await n8n.page.waitForTimeout(300);

			// After the switch, the input should now be in expression mode
			// Check if the inline expression editor is now visible
			const expressionEditor = parameterInput.getByTestId('inline-expression-editor-input');
			await expect(expressionEditor).toBeVisible();

			// Get the cursor position in the expression editor
			// The text should be "hello {{" and cursor should be at position 8 (end)
			// But the bug causes it to jump to position 0 (beginning)
			const cursorPosition = await expressionEditor.evaluate((el: HTMLElement) => {
				const selection = window.getSelection();
				if (selection && selection.rangeCount > 0) {
					const range = selection.getRangeAt(0);
					return range.startOffset;
				}
				// For input elements
				if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
					return el.selectionStart;
				}
				return -1;
			});

			// This assertion should fail initially, proving the bug exists
			// Expected: cursor at end (position 8)
			// Actual (bug): cursor at beginning (position 0)
			expect(cursorPosition).toBeGreaterThan(0);
		});

		test('should maintain cursor position when typing expression syntax in middle of text', async ({
			n8n,
		}) => {
			// Setup: Add a node with a text parameter
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Edit Fields (Set)', { closeNDV: false, action: 'Add Fields' });

			// Get the parameter input (initially in fixed mode)
			const parameterInput = n8n.ndv.getParameterInput('value').first();
			const valueInput = parameterInput.locator('input');

			// Click to focus
			await valueInput.click();

			// Type text that will trigger auto-switch
			await valueInput.type('prefix {{', { delay: 50 });

			// Wait for mode switch
			await n8n.page.waitForTimeout(300);

			// Verify expression editor is now visible
			const expressionEditor = parameterInput.getByTestId('inline-expression-editor-input');
			await expect(expressionEditor).toBeVisible();

			// Get the text content to verify it was preserved
			const content = await expressionEditor.textContent();
			expect(content).toContain('prefix');

			// Cursor should be at the end of the text
			// This test documents the expected behavior that currently fails
			const cursorPosition = await expressionEditor.evaluate((el: HTMLElement) => {
				const selection = window.getSelection();
				if (selection && selection.rangeCount > 0) {
					const range = selection.getRangeAt(0);
					// Get the total text length from the element
					const textLength = el.textContent?.length || 0;
					return { offset: range.startOffset, textLength };
				}
				return { offset: -1, textLength: 0 };
			});

			// Cursor should be at the end, not at the beginning
			expect(cursorPosition.offset).toBeGreaterThan(0);
		});

		test('should not lose text content when auto-switching to expression mode', async ({ n8n }) => {
			// Setup: Add a node with a text parameter
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Edit Fields (Set)', { closeNDV: false, action: 'Add Fields' });

			// Get the parameter input
			const parameterInput = n8n.ndv.getParameterInput('value').first();
			const valueInput = parameterInput.locator('input');

			// Type text that will trigger mode switch
			await valueInput.click();
			await valueInput.type('hello {{', { delay: 50 });

			// Wait for mode switch
			await n8n.page.waitForTimeout(300);

			// Verify expression editor is visible and contains the text
			const expressionEditor = parameterInput.getByTestId('inline-expression-editor-input');
			await expect(expressionEditor).toBeVisible();

			// Verify the text content is preserved
			const content = await expressionEditor.textContent();
			expect(content).toContain('hello');
			expect(content).toContain('{{');
		});
	},
);
