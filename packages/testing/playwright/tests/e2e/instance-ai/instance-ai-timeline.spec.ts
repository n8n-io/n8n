import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

test.describe(
	'Instance AI agent timeline @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('should show artifact cards after workflow build completes', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "artifact card test"',
			);

			await n8n.instanceAi.approveBuildPlan();

			await n8n.instanceAi.waitForAssistantResponse(120_000);

			// Artifact cards (N8nCard) should appear in the timeline after build
			await expect(n8n.instanceAi.getArtifactCards().first()).toBeVisible({ timeout: 30_000 });
		});
	},
);
