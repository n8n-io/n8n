import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

test.describe(
	'Instance AI artifacts @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('should display artifact card in timeline after workflow build', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "artifact display test"',
			);

			// New builds route through the planner and pause for user approval.
			await n8n.instanceAi.approveBuildPlan();

			// Wait for build to complete (no confirmation for simple builds)
			await n8n.instanceAi.waitForAssistantResponse(120_000);

			// An artifact card should appear in the timeline
			await expect(n8n.instanceAi.getArtifactCards().first()).toBeVisible({ timeout: 30_000 });
		});

		test('should open workflow preview when clicking artifact card', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "artifact click test"',
			);

			await n8n.instanceAi.approveBuildPlan();

			await n8n.instanceAi.waitForAssistantResponse(120_000);

			// Preview should auto-open after build
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 30_000,
			});

			// Close the preview first
			await n8n.instanceAi.getPreviewCloseButton().click();
			await expect(n8n.instanceAi.getPreviewIframeLocator()).toBeHidden();

			// Click the artifact card to re-open the preview
			await n8n.instanceAi.getArtifactCards().first().click();

			// Preview should open again with canvas nodes
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 30_000,
			});
		});
	},
);
