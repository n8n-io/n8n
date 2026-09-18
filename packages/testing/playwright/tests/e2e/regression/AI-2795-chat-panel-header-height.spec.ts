import { test, expect } from '../../../fixtures/base';

test.describe(
	'AI-2795: chat panel header height in the expanded logs pane',
	{ annotation: [{ type: 'owner', description: 'AI' }] },
	() => {
		test('keeps the chat header the same height as the overview header', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_chat_partial_execution.json');
			await n8n.notifications.quickCloseAll();

			// The bug only shows when the pane is expanded: the chat body is a flex
			// item then, and before the fix it shrank the shared header to 24px.
			await n8n.canvas.logsPanel.open();

			const chatHeader = n8n.canvas.logsPanel.getChatHeader();
			const overviewHeader = n8n.canvas.logsPanel.getOverviewHeader();

			await expect(chatHeader).toBeVisible();
			await expect(overviewHeader).toBeVisible();

			const chatBox = await chatHeader.boundingBox();
			const overviewBox = await overviewHeader.boundingBox();

			expect(chatBox).not.toBeNull();
			expect(overviewBox).not.toBeNull();

			// Equal heights keep the border-bottom continuous across the pane.
			expect(chatBox!.height).toBeCloseTo(overviewBox!.height, 1);
		});
	},
);
