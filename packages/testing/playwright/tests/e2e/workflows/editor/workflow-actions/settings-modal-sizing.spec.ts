import { test, expect } from '../../../../../fixtures/base';

/**
 * Reproduces ADO-5594: the workflow settings modal is too small, so its
 * content is cut off and only reachable by scrolling.
 *
 * On the standard MacBook viewport (1536x960) the modal is capped at
 * `max-height: 80%` (~768px). Once the header, footer and padding are
 * subtracted, the scrollable content region is far shorter than the stacked
 * settings rows, so the modal overflows and the lower settings are hidden
 * until the user scrolls inside the dialog.
 *
 * This test asserts the desired behaviour — all settings visible without
 * scrolling — and therefore currently FAILS, capturing the bug.
 */
test.describe(
	'Workflow Settings modal sizing',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test('should show all settings without cutting off content', async ({ n8n }) => {
			await n8n.workflowSettingsModal.open();
			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();

			// The modal content must fit its visible area; if it overflows, the
			// lower settings are cut off and only reachable by scrolling.
			expect(await n8n.workflowSettingsModal.isContentCutOff()).toBe(false);
		});
	},
);
