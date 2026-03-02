import { test, expect } from '../../../../../fixtures/base';

/**
 * Regression test for N8N-9747: Visual issues with execute workflow buttons on canvas
 *
 * Bug Description:
 * When multiple triggers are present on the canvas and a workflow is executed from one trigger,
 * visual inconsistencies occur with the execute workflow buttons:
 * 1. Non-active trigger displays execute button in semi-transparent (broken) state
 * 2. Main execute workflow button's loading state overlaps the border of trigger selection dropdown
 *
 * Expected:
 * - Only the active trigger's execute button should be prominent during execution
 * - Non-active triggers should have hidden/fully transparent buttons
 * - Loading state should not overlap other UI elements like the dropdown
 */
test.describe(
	'Execute Workflow Button Visual States',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'issue', description: 'N8N-9747' },
		],
	},
	() => {
		test('should show only hovered trigger execute button, hide others completely', async ({
			n8n,
		}) => {
			await n8n.start.fromImportedWorkflow('Two_schedule_triggers.json');
			await n8n.canvas.clickZoomToFitButton();

			// Initially, both trigger execute buttons should be hidden (opacity: 0)
			await expect(n8n.canvas.getExecuteWorkflowButton('Trigger A')).toHaveCSS('opacity', '0');
			await expect(n8n.canvas.getExecuteWorkflowButton('Trigger B')).toHaveCSS('opacity', '0');

			// Hover over Trigger A - only its button should be visible
			await n8n.canvas.nodeByName('Trigger A').hover();
			await expect(n8n.canvas.getExecuteWorkflowButton('Trigger A')).toHaveCSS('opacity', '1');
			await expect(n8n.canvas.getExecuteWorkflowButton('Trigger B')).toHaveCSS('opacity', '0');

			// Hover over Trigger B - only its button should be visible
			await n8n.canvas.nodeByName('Trigger B').hover();
			await expect(n8n.canvas.getExecuteWorkflowButton('Trigger A')).toHaveCSS('opacity', '0');
			await expect(n8n.canvas.getExecuteWorkflowButton('Trigger B')).toHaveCSS('opacity', '1');
		});

		test('should not show semi-transparent execute buttons on non-active triggers during execution', async ({
			n8n,
		}) => {
			await n8n.start.fromImportedWorkflow('Two_schedule_triggers.json');
			await n8n.canvas.clickZoomToFitButton();

			// Hover and click execute on Trigger A
			await n8n.canvas.nodeByName('Trigger A').hover();
			await n8n.canvas.clickExecuteWorkflowButton('Trigger A');

			// CRITICAL: During execution, Trigger B's execute button should NOT be visible
			// even in a semi-transparent state. It should have opacity: 0
			const triggerBButton = n8n.canvas.getExecuteWorkflowButton('Trigger B');
			await expect(triggerBButton).toHaveCSS('opacity', '0');

			// Verify the button is truly hidden, not just semi-transparent
			await expect(triggerBButton).not.toBeVisible();

			// Wait for execution to complete
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully');

			// After execution, both buttons should still be hidden unless hovered
			await expect(n8n.canvas.getExecuteWorkflowButton('Trigger A')).toHaveCSS('opacity', '0');
			await expect(n8n.canvas.getExecuteWorkflowButton('Trigger B')).toHaveCSS('opacity', '0');
		});

		test('should not show broken semi-transparent execute buttons when hovering over non-active trigger during execution', async ({
			n8n,
		}) => {
			await n8n.start.fromImportedWorkflow('Two_schedule_triggers.json');
			await n8n.canvas.clickZoomToFitButton();

			// Start execution from Trigger A
			await n8n.canvas.nodeByName('Trigger A').hover();
			await n8n.canvas.clickExecuteWorkflowButton('Trigger A');

			// While execution is running, hover over Trigger B
			// BUG: This should NOT show a semi-transparent/broken execute button
			await n8n.canvas.nodeByName('Trigger B').hover();

			const triggerBButton = n8n.canvas.getExecuteWorkflowButton('Trigger B');

			// The button should either be fully visible (opacity: 1) and disabled
			// OR completely hidden (opacity: 0), but NOT semi-transparent
			const opacity = await triggerBButton.evaluate((el) =>
				window.getComputedStyle(el).getPropertyValue('opacity'),
			);

			// Assert: opacity should be either '0' (hidden) or '1' (visible but disabled)
			// NOT a value like '0.5' or '0.3' which indicates broken semi-transparent state
			expect(['0', '1']).toContain(opacity);

			// If visible, it should be disabled during execution
			if (opacity === '1') {
				await expect(triggerBButton).toBeDisabled();
			}

			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully');
		});

		test('should ensure loading state does not overlap trigger selection dropdown border', async ({
			n8n,
		}) => {
			await n8n.start.fromImportedWorkflow('Two_schedule_triggers.json');
			await n8n.canvas.clickZoomToFitButton();

			// Get the main execute workflow button (center bottom of canvas)
			const mainExecuteButton = n8n.canvas.getExecuteWorkflowButton();

			// Start execution to show loading state
			await n8n.canvas.clickExecuteWorkflowButton();

			// The loading spinner should be visible
			await expect(n8n.canvas.getExecuteWorkflowButtonSpinner()).toBeVisible();

			// Get bounding boxes to check for overlap
			const buttonBox = await mainExecuteButton.boundingBox();
			expect(buttonBox).not.toBeNull();

			// The button should maintain its layout and not expand beyond its container
			// This tests that the loading state doesn't cause visual overflow
			// In the bug, the loading state overlaps the dropdown border
			const chevronButton = mainExecuteButton
				.locator('..')
				.locator('button[aria-label="Select trigger node"]');

			// If there's a split button with dropdown, verify no overlap
			const chevronExists = (await chevronButton.count()) > 0;
			if (chevronExists) {
				const chevronBox = await chevronButton.boundingBox();
				expect(chevronBox).not.toBeNull();

				if (buttonBox && chevronBox) {
					// The main button should not extend into the chevron/dropdown area
					// Allow 1px tolerance for rounding
					expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(chevronBox.x + 1);
				}
			}

			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully');
		});

		test('should maintain consistent visual state for all execute buttons after execution completes', async ({
			n8n,
		}) => {
			await n8n.start.fromImportedWorkflow('Two_schedule_triggers.json');
			await n8n.canvas.clickZoomToFitButton();

			// Execute from Trigger A
			await n8n.canvas.nodeByName('Trigger A').hover();
			await n8n.canvas.clickExecuteWorkflowButton('Trigger A');
			await n8n.notifications.waitForNotificationAndClose('Workflow executed successfully');

			// After execution, all execute buttons should return to initial hidden state
			await expect(n8n.canvas.getExecuteWorkflowButton('Trigger A')).toHaveCSS('opacity', '0');
			await expect(n8n.canvas.getExecuteWorkflowButton('Trigger B')).toHaveCSS('opacity', '0');

			// Hover interactions should still work correctly
			await n8n.canvas.nodeByName('Trigger B').hover();
			await expect(n8n.canvas.getExecuteWorkflowButton('Trigger B')).toHaveCSS('opacity', '1');
			await expect(n8n.canvas.getExecuteWorkflowButton('Trigger A')).toHaveCSS('opacity', '0');
		});
	},
);
