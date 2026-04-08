import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

/**
 * Tests that nodes in the instance AI workflow preview clear their running
 * state after execution completes. Captures a bug where the last node stays
 * in executing state (spinning border) because the executing-node queue in
 * the preview iframe is never properly cleared.
 */
test.describe(
	'Instance AI execution state',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('preview nodes should clear running state after execution completes', async ({ n8n }) => {
			// 1. Navigate to instance AI
			await n8n.navigate.toInstanceAi();

			// 2. Send a specific prompt that skips clarifying questions
			await n8n.instanceAi
				.getChatInput()
				.fill(
					'build a simple workflow (manual trigger -> wait node 5 sec -> set node) called "hello world 116" and run it',
				);
			await n8n.instanceAi.getSendButton().click();

			// 3. Approve the workflow execution when the confirmation panel appears
			await expect(n8n.instanceAi.getConfirmApproveButton()).toBeVisible({ timeout: 120_000 });
			await n8n.instanceAi.getConfirmApproveButton().click();

			// 4. Wait for the preview iframe to show canvas nodes
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 30_000,
			});

			// 5. Wait for execution to finish — success indicators should appear
			await expect(n8n.instanceAi.getPreviewSuccessIndicators().first()).toBeVisible({
				timeout: 30_000,
			});

			// 6. BUG ASSERTION: no nodes should be stuck in running/waiting state
			//    after the execution completes. The last node (Set) stays spinning
			//    due to the executing-node queue not being cleared.
			await expect(n8n.instanceAi.getPreviewRunningNodes()).toHaveCount(0);
		});
	},
);
