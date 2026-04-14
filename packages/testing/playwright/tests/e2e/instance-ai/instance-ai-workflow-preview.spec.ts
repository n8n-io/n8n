import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

test.describe(
	'Instance AI workflow preview @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('should auto-open preview panel when workflow is built', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "preview auto-open test"',
			);

			// Preview should auto-open with canvas nodes visible (no confirmation for simple builds)
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});
		});

		test('should display canvas nodes in preview iframe', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a workflow with manual trigger connected to a set node called "canvas nodes test"',
			);

			// Should show canvas nodes in the preview
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});
			await expect(n8n.instanceAi.getPreviewCanvasNodes()).not.toHaveCount(0);
		});

		test('should close preview panel via close button', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "close preview test"',
			);

			// Wait for preview to auto-open
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});

			// Close the preview
			await n8n.instanceAi.getPreviewCloseButton().click();

			// Preview iframe should no longer be visible
			await expect(n8n.instanceAi.getPreviewIframeLocator()).toBeHidden();
		});
	},
);
