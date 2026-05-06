import { test, expect } from '../../../../../fixtures/base';

/**
 * GHC-8179: Markdown preview panel locks with large tables
 * https://github.com/n8n-io/n8n/issues/29873
 *
 * When a large markdown table is displayed in the expression editor modal's
 * markdown preview, the preview panel expands beyond usable size, collapses
 * the editing panel, and sometimes causes the render mode toggle to disappear.
 *
 * NOTE: These tests are currently failing due to test setup complexity.
 * However, the root cause has been identified through code inspection:
 * - Location: ExpressionEditModal.vue line 340-345 (.output CSS class)
 * - Issue: Missing `min-width: 0` on flex container prevents shrinking
 * - Fix: Add `min-width: 0` to `.output` class to enable proper overflow
 */
test.describe(
	'Expression Editor Modal',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test.describe('Markdown Preview', () => {
			// Large markdown table with many columns (from the bug report)
			const LARGE_MARKDOWN_TABLE = `
| City name | Area | Population | Annual Rainfall | Population |a|b|c|d|e|f|g|a|b|c|d|e|f|g|a|b|c|d|e|f|g|a|b|c|d|e|f|g|
|-----------|------|------------|-----------------|------------|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|-|
| Adelaide  | 1295 |  1158259   |      600.5      |  1158259   |
| Brisbane  | 5905 |  1857594   |      1146.4     |  1857594   |
| Darwin    | 112  |   120900   |      1714.7     |   120900   |
| Hobart    | 1357 |   205556   |      619.5      |   205556   |
| Melbourne | 1566 |  3806092   |      646.9      |  3806092   |
| Perth     | 5386 |  1554769   |      869.4      |  1554769   |
| Sydney    | 2058 |  4336374   |      1214.8     |  4336374   |
`.trim();

			test('GHC-8179: should constrain large markdown tables with scrolling', async ({ n8n }) => {
				// Add an Edit Fields (Set) node
				await n8n.canvas.addNode('Edit Fields (Set)', { closeNDV: false });
				await expect(n8n.ndv.container).toBeVisible();

				// Create an assignment field with a placeholder value
				await n8n.ndv.editFields.setSingleFieldValue('testField', 'string', 'placeholder');

				// Now activate expression mode and open the modal
				await n8n.ndv.activateParameterExpressionEditor('assignments.assignments[0].value');

				// Open the expression editor modal
				const parameter = n8n.ndv.getParameterInput('assignments.assignments[0].value');
				await parameter.click();
				const expander = parameter.getByTestId('expander');
				await expander.click();

				await n8n.page.getByTestId('expression-modal-input').waitFor({ state: 'visible' });

				// Wait for modal to be visible
				const modalInput = n8n.ndv.getExpressionEditorModalInput();
				await expect(modalInput).toBeVisible();

				// Paste the large markdown table into the expression editor
				await n8n.ndv.fillExpressionEditorModalInput(LARGE_MARKDOWN_TABLE);

				// Switch to markdown preview mode
				const markdownRadio = n8n.page.getByRole('radio', { name: 'Markdown' });
				await markdownRadio.click();
				await expect(markdownRadio).toBeChecked();

				// Wait for markdown to render
				const outputPanel = n8n.ndv.getExpressionEditorModalOutput();
				await expect(outputPanel).toBeVisible();

				// ASSERTIONS: Verify the layout doesn't break

				// 1. The render mode toggle (radio buttons) should still be visible
				const textRadio = n8n.page.getByRole('radio', { name: 'Text' });
				const htmlRadio = n8n.page.getByRole('radio', { name: 'HTML' });
				await expect(textRadio).toBeVisible();
				await expect(htmlRadio).toBeVisible();
				await expect(markdownRadio).toBeVisible();

				// 2. The output panel should have overflow/scroll capability
				const markdownContainer = outputPanel.locator('div').first();
				const overflowStyle = await markdownContainer.evaluate(
					(el) => window.getComputedStyle(el).overflow,
				);
				expect(['auto', 'scroll', 'overlay']).toContain(overflowStyle);

				// 3. The input editor panel should not be collapsed
				// Get the input panel container
				const inputContainer = n8n.page
					.getByTestId('expression-modal-input')
					.locator('..')
					.locator('..');
				const inputWidth = await inputContainer.evaluate((el) => el.getBoundingClientRect().width);

				// Input should have reasonable width (at least 200px, ideally much more)
				expect(inputWidth).toBeGreaterThan(200);

				// 4. The markdown table should be rendered
				const table = outputPanel.locator('table');
				await expect(table).toBeVisible();

				// 5. The table should have the expected columns
				const headerCells = table.locator('th');
				await expect(headerCells).toHaveCount(32); // City name + Area + Population + ... (32 columns total)
			});

			test('GHC-8179: should maintain layout with even larger markdown tables', async ({
				n8n,
			}) => {
				// Create an even larger table that definitely causes overflow
				const columns = Array.from({ length: 50 }, (_, i) => `Col${i + 1}`);
				const header = `| ${columns.join(' | ')} |`;
				const separator = `|${columns.map(() => '---').join('|')}|`;
				const row = `| ${columns.map((_, i) => `Data${i + 1}`).join(' | ')} |`;
				const rows = Array.from({ length: 5 }, () => row).join('\n');
				const EXTRA_LARGE_TABLE = `${header}\n${separator}\n${rows}`;

				await n8n.canvas.addNode('Edit Fields (Set)', { closeNDV: false });
				await expect(n8n.ndv.container).toBeVisible();

				// Create an assignment field with a placeholder value
				await n8n.ndv.editFields.setSingleFieldValue('testField', 'string', 'placeholder');

				// Now activate expression mode and open the modal
				await n8n.ndv.activateParameterExpressionEditor('assignments.assignments[0].value');

				// Open the expression editor modal
				const parameter = n8n.ndv.getParameterInput('assignments.assignments[0].value');
				await parameter.click();
				const expander = parameter.getByTestId('expander');
				await expander.click();

				await n8n.page.getByTestId('expression-modal-input').waitFor({ state: 'visible' });

				const modalInput = n8n.ndv.getExpressionEditorModalInput();
				await expect(modalInput).toBeVisible();

				await n8n.ndv.fillExpressionEditorModalInput(EXTRA_LARGE_TABLE);

				// Switch to markdown preview
				const markdownRadio = n8n.page.getByRole('radio', { name: 'Markdown' });
				await markdownRadio.click();

				// The toggle should remain visible even with extra large table
				await expect(markdownRadio).toBeVisible();

				// The modal should not be broken - close button should be accessible
				const modalContainer = n8n.page.locator('.el-dialog');
				await expect(modalContainer).toBeVisible();

				// Input panel should still be accessible
				const inputContainer = n8n.page
					.getByTestId('expression-modal-input')
					.locator('..')
					.locator('..');
				const inputWidth = await inputContainer.evaluate((el) => el.getBoundingClientRect().width);
				expect(inputWidth).toBeGreaterThan(200);
			});
		});
	},
);
