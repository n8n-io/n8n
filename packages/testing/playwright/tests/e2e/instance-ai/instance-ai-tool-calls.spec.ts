import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

test.describe(
	'Instance AI tool calls @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('should show subagent activity summary after workflow build', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a simple workflow with a manual trigger and a set node called "tool call test"',
			);

			await n8n.instanceAi.waitForResponseComplete();

			// The timeline should show a subagent activity summary (e.g., "1 subagents")
			// This appears when the agent delegates work to sub-agents for workflow building
			const subagentButton = n8n.page.getByRole('button', { name: /subagent/i });
			await expect(subagentButton).toBeVisible({ timeout: 30_000 });
		});

		test('should expand subagent details when clicking summary', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a workflow with a manual trigger and a code node called "tool expand test"',
			);

			await n8n.instanceAi.waitForResponseComplete();

			// Click the subagent summary button to expand the tool call timeline
			const subagentButton = n8n.page.getByRole('button', { name: /subagent/i });
			await expect(subagentButton).toBeVisible({ timeout: 30_000 });
			await subagentButton.click();

			// After expanding, the trigger should have aria-expanded="true"
			await expect(subagentButton).toHaveAttribute('aria-expanded', 'true', { timeout: 5_000 });
		});
	},
);
