import { test, expect, instanceAiTestConfig } from './fixtures';

const TERMINAL_FALLBACK_TEXT = 'I finished the run, but I did not generate a final response';

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI workflow preview @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test.describe.configure({ timeout: 180_000 });

		test('should auto-open preview panel when workflow is built', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "preview auto-open test". Save it only; do not run or execute it after building.',
			);

			// Preview should auto-open with canvas nodes visible (no confirmation for simple builds)
			const firstNode = n8n.instanceAi.getPreviewCanvasNodes().first();
			await expect(firstNode).toBeVisible({ timeout: 120_000 });

			// Regression guard for INS-256: if fitView runs against a near-zero
			// container (mid slide-in), nodes end up microscopic. The fix re-fits
			// once the panel transition completes. Poll until the node settles to
			// a reasonable on-screen width.
			await expect
				.poll(async () => (await firstNode.boundingBox())?.width ?? 0, { timeout: 5_000 })
				.toBeGreaterThan(50);
			await Promise.race([
				n8n.instanceAi.getSendButton().waitFor({ state: 'visible', timeout: 120_000 }),
				n8n.instanceAi.getConfirmDenyButton().click({ timeout: 120_000 }),
			]);
			await n8n.instanceAi.waitForResponseComplete();
			await expect(n8n.instanceAi.getAssistantMessageText(TERMINAL_FALLBACK_TEXT)).toHaveCount(0);
			await expect(n8n.instanceAi.getBackgroundTaskIndicator()).toBeHidden();
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
			await n8n.instanceAi.waitForResponseComplete();
		});

		test('should mark all nodes as success after execution completes', async ({ n8n }) => {
			// End-to-end: plan + approve + build + execute + final assertions take >60s
			// when recording against the real Anthropic API.
			test.setTimeout(180_000);
			await n8n.navigate.toInstanceAi();

			// A Wait node creates a window where the downstream node is briefly
			// marked `running`. When execution ends, the terminal node should flip
			// to `success` — the bug is that it stays `running` (orange border).
			await n8n.instanceAi.sendMessage(
				'Build a workflow with a manual trigger, a Wait node set to 1 second, ' +
					'and a Set node called "running state test".',
			);

			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 120_000,
			});
			await n8n.instanceAi.runPreviewWorkflow();

			// All three nodes should show the success indicator.
			await expect(n8n.instanceAi.getPreviewSuccessIndicators()).toHaveCount(3, {
				timeout: 30_000,
			});
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

			// Hide the preview
			await n8n.instanceAi.getPreviewToggleButton().click();

			// Preview iframe should no longer be visible
			await expect(n8n.instanceAi.getPreviewIframeLocator()).toBeHidden();
		});
	},
);
