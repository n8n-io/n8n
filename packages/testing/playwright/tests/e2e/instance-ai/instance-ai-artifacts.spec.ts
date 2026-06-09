import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI artifacts @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test.describe.configure({ timeout: 180_000 });

		test('should display artifact card in timeline after workflow build', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "artifact display test"',
			);

			// New builds route through the planner and pause for user approval.
			await n8n.instanceAi.approveBuildPlan();

			await expect(n8n.instanceAi.getPreviewTabByName(/artifact display test/i)).toBeVisible({
				timeout: 120_000,
			});
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 30_000,
			});
			await n8n.instanceAi.waitForResponseComplete();
		});

		test('should open workflow preview when clicking artifact card', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "artifact click test"',
			);

			await n8n.instanceAi.approveBuildPlan();

			await n8n.instanceAi.waitForResponseComplete(120_000);

			// Preview should auto-open after build
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 30_000,
			});
			await n8n.instanceAi.waitForResponseComplete();

			// Hide the preview first
			await n8n.instanceAi.getPreviewToggleButton().click();
			await expect(n8n.instanceAi.getPreviewIframeLocator()).toBeHidden();

			// Click the artifact entry to re-open the preview
			await n8n.instanceAi.getArtifactPanelLinkByName(/Open artifact click test/i).click();

			// Preview should open again with canvas nodes
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 30_000,
			});
		});
	},
);
