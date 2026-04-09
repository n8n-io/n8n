import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

test.describe(
	'ADO-5045: Focus Panel resize with long text',
	{
		annotation: [
			{ type: 'owner', description: 'Adore' },
			{ type: 'issue', description: 'https://linear.app/n8n/issue/ADO-5045' },
		],
	},
	() => {
		const requirements: TestRequirements = {
			storage: {
				N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ ndv_in_focus_panel: 'variant' }),
			},
		};

		test('should resize Focus Panel to fit long text in parameter', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(requirements);
			await n8n.start.fromImportedWorkflow('long-text-parameter.json');
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.deselectAll();

			// Enable focus panel first, before selecting the node
			await n8n.canvas.toggleFocusPanelButton().click();

			// Now click on the OpenAI node
			await n8n.canvas.nodeByName('OpenAI Node').click();

			// Wait for node to be shown in focus panel
			await expect(n8n.canvas.focusPanel.getHeaderNodeName()).toHaveText('OpenAI Node');

			// Get the long text parameter field
			// Based on the error context, this should be a textbox
			const parameterField = n8n.page.getByRole('textbox', {
				name: /Parameter.*responses\.values.*content/,
			});

			// Verify the parameter field is visible
			await expect(parameterField).toBeVisible({ timeout: 10000 });

			// Verify the text content is present
			const textContent = await parameterField.inputValue();
			expect(textContent).toContain('Given a description of a linear ticket');
			expect(textContent.length).toBeGreaterThan(400); // Should contain the repeated long text

			// Get the bounding box to verify sizing
			const parameterBox = await parameterField.boundingBox();
			expect(parameterBox).not.toBeNull();

			// The issue is that the parameter text doesn't properly resize
			// This test documents the expected behavior but will fail if the bug exists
			if (parameterBox) {
				// The text area should have a reasonable height to display the content
				// If it's too small (< 100px), the text is likely cut off
				expect(parameterBox.height).toBeGreaterThan(100);
			}
		});

		test('should display long text without cutting off in Focus Panel', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(requirements);
			await n8n.start.fromImportedWorkflow('long-text-parameter.json');
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.deselectAll();

			// Enable focus panel first
			await n8n.canvas.toggleFocusPanelButton().click();

			// Click on the OpenAI node
			await n8n.canvas.nodeByName('OpenAI Node').click();

			// Wait for node to be shown in focus panel
			await expect(n8n.canvas.focusPanel.getHeaderNodeName()).toHaveText('OpenAI Node');

			// Get the long text parameter field
			const parameterField = n8n.page.getByRole('textbox', {
				name: /Parameter.*responses\.values.*content/,
			});

			await expect(parameterField).toBeVisible({ timeout: 10000 });

			// Verify all text content is accessible
			const textContent = await parameterField.inputValue();
			expect(textContent).toContain('Given a description of a linear ticket');

			// Count the number of repetitions (should be 6 based on the workflow JSON)
			const repetitions = (textContent.match(/Given a description/g) || []).length;
			expect(repetitions).toBeGreaterThanOrEqual(6);

			// The parameter field should be scrollable if needed or auto-expand
			// Get the scrollHeight vs clientHeight to check if scrolling is needed
			const scrollInfo = await parameterField.evaluate((el: HTMLTextAreaElement) => ({
				scrollHeight: el.scrollHeight,
				clientHeight: el.clientHeight,
				scrollTop: el.scrollTop,
			}));

			// If content overflows, the element should be scrollable
			if (scrollInfo.scrollHeight > scrollInfo.clientHeight) {
				// Try scrolling to the bottom
				await parameterField.evaluate((el: HTMLTextAreaElement) => {
					el.scrollTop = el.scrollHeight;
				});

				await n8n.page.waitForTimeout(100);

				// Verify we can scroll
				const newScrollTop = await parameterField.evaluate(
					(el: HTMLTextAreaElement) => el.scrollTop,
				);
				expect(newScrollTop).toBeGreaterThan(0);
			}
		});
	},
);
