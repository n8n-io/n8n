import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

test.describe(
	'Instance AI confirmations @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('should show approval panel and approve workflow execution', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			// "build and run" triggers a confirmation for the execution step
			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "approval test" and run it',
			);

			// Approve the build plan so the orchestrator proceeds to the run step.
			await n8n.instanceAi.approveBuildPlan();

			await expect(n8n.instanceAi.getConfirmApproveButton()).toBeVisible({ timeout: 120_000 });
			await n8n.instanceAi.getConfirmApproveButton().click();

			// After approval, execution should proceed
			await expect(n8n.instanceAi.getAssistantMessages().first()).toBeVisible({
				timeout: 120_000,
			});
		});

		test('should show approval panel and deny workflow execution', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "deny test" and run it',
			);

			await n8n.instanceAi.approveBuildPlan();

			await expect(n8n.instanceAi.getConfirmDenyButton()).toBeVisible({ timeout: 120_000 });
			await n8n.instanceAi.getConfirmDenyButton().click();

			// After denial, the assistant should acknowledge
			await expect(n8n.instanceAi.getAssistantMessages().first()).toBeVisible({
				timeout: 120_000,
			});
		});
	},
);
