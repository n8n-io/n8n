import type { Locator } from '@playwright/test';

import { test, expect } from '../../../fixtures/base';

// The panels of the bottom pane sit in one flex row, so their headers share a
// single `--logs-panel--header-height` and their bottom borders must line up
// into one divider that runs the full width of the pane. A header that resolves
// to a different height breaks that divider.
// Sub-pixel rounding only: the reported gap is a few pixels.
const ALIGNMENT_TOLERANCE = 0.5;

async function bounds(locator: Locator) {
	const box = await locator.boundingBox();
	expect(box).not.toBeNull();
	return box!;
}

test.describe(
	'AI-2795: chat panel header height in the expanded logs pane',
	{ annotation: [{ type: 'owner', description: 'AI' }] },
	() => {
		test('keeps the chat header aligned with the overview header so the divider is unbroken', async ({
			n8n,
		}) => {
			// Chat trigger + agent + chat model, so the pane shows the chat panel
			// next to the overview panel.
			await n8n.start.fromImportedWorkflow('Workflow_ai_agent.json');
			await n8n.notifications.quickCloseAll();
			await n8n.canvas.clickZoomToFitButton();

			await n8n.canvas.logsPanel.open();

			const chatHeader = n8n.canvas.logsPanel.getChatHeader();
			const overviewHeader = n8n.canvas.logsPanel.getOverviewHeader();
			await expect(chatHeader).toBeVisible();
			await expect(overviewHeader).toBeVisible();
			// The chat body only takes part in the layout once the pane is expanded.
			await expect(n8n.canvas.logsPanel.getManualChatInput()).toBeVisible();

			// Poll rather than measure once: the pane animates open.
			await expect
				.poll(async () => (await bounds(chatHeader)).height - (await bounds(overviewHeader)).height)
				.toBeCloseTo(0, 0);

			// The divider is the bottom edge of the headers. Both panels are
			// top-aligned in the same row, so an equal bottom edge means one
			// continuous line across the pane.
			const chat = await bounds(chatHeader);
			const overview = await bounds(overviewHeader);
			expect(Math.abs(chat.y + chat.height - (overview.y + overview.height))).toBeLessThanOrEqual(
				ALIGNMENT_TOLERANCE,
			);
		});
	},
);
