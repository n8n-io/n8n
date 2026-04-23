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

		test('should mark all nodes as success after execution completes', async ({
			n8n,
		}, testInfo) => {
			test.skip(
				testInfo.project.name.includes('multi-main'),
				'Execution preview replay is not yet stable in multi-main mode',
			);
			await n8n.navigate.toInstanceAi();

			// A Wait node creates a window where the downstream node is briefly
			// marked `running`. When execution ends, the terminal node should flip
			// to `success` — the bug is that it stays `running` (orange border).
			await n8n.instanceAi.sendMessage(
				'Build a workflow with a manual trigger, a Wait node set to 1 second, ' +
					'and a Set node called "running state test". After it is built, ' +
					'run it.',
			);

			await expect(n8n.instanceAi.getConfirmApproveButton()).toBeVisible({ timeout: 120_000 });
			await n8n.instanceAi.getConfirmApproveButton().click();

			await n8n.instanceAi.waitForResponseComplete();

			// All three nodes should show the success indicator.
			await expect(n8n.instanceAi.getPreviewSuccessIndicators()).toHaveCount(3);
			// No node should still be in the running/waiting state.
			await expect(n8n.instanceAi.getPreviewRunningNodes()).toHaveCount(0);
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
