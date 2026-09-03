import {
	CODE_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Code node',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.describe('Code editor', () => {
			test.beforeEach(async ({ n8n }) => {
				await n8n.start.fromBlankCanvas();
				await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });
			});

			test('should show correct placeholders switching modes', async ({ n8n }) => {
				await expect(
					n8n.ndv.getPlaceholderText('// Loop over input items and add a new field'),
				).toBeVisible();

				await n8n.ndv.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');

				await expect(
					n8n.ndv.getPlaceholderText("// Add a new field called 'myNewField'"),
				).toBeVisible();

				await n8n.ndv.selectOptionInParameterDropdown('mode', 'Run Once for All Items');

				await expect(
					n8n.ndv.getPlaceholderText('// Loop over input items and add a new field'),
				).toBeVisible();
			});

			test('should execute the placeholder successfully in both modes', async ({ n8n }) => {
				await n8n.ndv.execute();

				await expect(
					n8n.notifications.getNotificationByTitle('Node executed successfully').first(),
				).toBeVisible();

				await n8n.ndv.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');

				await n8n.ndv.execute();

				await expect(
					n8n.notifications.getNotificationByTitle('Node executed successfully').first(),
				).toBeVisible();
			});

			test('should allow switching between sibling code nodes', async ({ n8n }) => {
				await n8n.ndv.getCodeEditor().fill("console.log('Code in JavaScript1')");
				await n8n.ndv.close();

				await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });

				await n8n.ndv.getCodeEditor().fill("console.log('Code in JavaScript2')");
				await n8n.ndv.close();

				await n8n.canvas.openNode(CODE_NODE_DISPLAY_NAME);

				await n8n.ndv.clickFloatingNode(CODE_NODE_DISPLAY_NAME + '1');
				await expect(n8n.ndv.getCodeEditor()).toContainText("console.log('Code in JavaScript2')");

				await n8n.ndv.clickFloatingNode(CODE_NODE_DISPLAY_NAME);
				await expect(n8n.ndv.getCodeEditor()).toContainText("console.log('Code in JavaScript1')");
			});

			test('should show lint errors in `runOnceForAllItems` mode', async ({ n8n }) => {
				await n8n.ndv.getCodeEditor().fill(`$input.itemMatching()
$input.item
$('When clicking ‘Execute workflow’').item
$input.first(1)

for (const item of $input.all()) {
  item.foo
}

return
`);
				await expect(n8n.ndv.getLintErrors()).toHaveCount(6);
				const firstLintError = n8n.ndv.getLintErrors().first();
				await expect(firstLintError).toBeVisible();
				await firstLintError.hover({ force: true });

				// Wait for lint tooltip to appear after hover
				await expect(n8n.ndv.getLintTooltip()).toBeVisible({ timeout: 5000 });
				await expect(n8n.ndv.getLintTooltip()).toContainText(
					'`.itemMatching()` expects an item index to be passed in as its argument.',
				);
			});
		});

		test.describe
			.serial('Run Once for Each Item', () => {
				test('should show lint errors in `runOnceForEachItem` mode', async ({ n8n }) => {
					await n8n.start.fromBlankCanvas();
					await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
					await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });
					await n8n.ndv.toggleCodeMode('Run Once for Each Item');

					await n8n.ndv.getCodeEditor().fill(`$input.itemMatching()
$input.all()
$input.first()
$input.item()

return []
`);
					// Verify lint errors are detected (tooltip hover tested in runOnceForAllItems test)
					await expect(n8n.ndv.getLintErrors()).toHaveCount(7);
				});
			});
	},
);
