import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI agent timeline @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test.describe.configure({ timeout: 180_000 });

		test('should show artifact cards after workflow build completes', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "artifact card test"',
			);

			await n8n.instanceAi.approveBuildPlan();

			await expect(n8n.instanceAi.getPreviewTabByName(/artifact card test/i)).toBeVisible({
				timeout: 120_000,
			});
			await expect(n8n.instanceAi.getPreviewCanvasNodes().first()).toBeVisible({
				timeout: 30_000,
			});
			await n8n.instanceAi.waitForResponseComplete();
		});
	},
);
