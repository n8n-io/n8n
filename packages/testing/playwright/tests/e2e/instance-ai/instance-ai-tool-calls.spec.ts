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
			await expect(n8n.instanceAi.getSubagentSummaries().first()).toBeVisible({
				timeout: 30_000,
			});
		});

		test('should expand subagent details when clicking summary', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a workflow with a manual trigger and a code node called "tool expand test"',
			);

			await n8n.instanceAi.waitForResponseComplete();

			// Click the subagent summary button to expand the tool call timeline
			const subagentButton = n8n.instanceAi.getSubagentSummaries().first();
			await expect(subagentButton).toBeVisible({ timeout: 30_000 });
			await subagentButton.click();

			// After expanding, the trigger should have aria-expanded="true"
			await expect(subagentButton).toHaveAttribute('aria-expanded', 'true', { timeout: 5_000 });
		});

		test('should show tool call steps for web search', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Search the web to find what the latest LTS version of Node.js is',
			);

			// The researcher may trigger domain access approval — approve it
			const approveButton = n8n.instanceAi.getDomainAccessApproveButton().first();
			await expect(approveButton).toBeVisible({ timeout: 90_000 });
			await approveButton.click();

			await n8n.instanceAi.waitForResponseComplete();

			// Response should contain useful content from the web search
			await expect(n8n.instanceAi.getAssistantMessages().first()).not.toHaveText('');

			// Expand the tool calls summary to reveal individual steps
			const toolCallsButton = n8n.instanceAi.getToolCallSummaries().first();
			await expect(toolCallsButton).toBeVisible({ timeout: 30_000 });
			await toolCallsButton.click();
			await expect(toolCallsButton).toHaveAttribute('aria-expanded', 'true', { timeout: 5_000 });

			// Tool call steps should be visible (web-search renders as ToolCallStep)
			await expect(n8n.instanceAi.getToolCallSteps().first()).toBeVisible({ timeout: 5_000 });
		});

		test('should show tool call steps for fetch URL', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Fetch the content from https://example.com and summarize what the page is about',
			);

			// The researcher may trigger domain access approval — approve it
			const approveButton = n8n.instanceAi.getDomainAccessApproveButton().first();
			await expect(approveButton).toBeVisible({ timeout: 90_000 });
			await approveButton.click();

			await n8n.instanceAi.waitForResponseComplete();

			// Response should contain content from the fetched URL
			await expect(n8n.instanceAi.getAssistantMessages().first()).not.toHaveText('');

			// fetch-url renders as a ToolCallStep directly in the timeline
			// (single tool calls are not collapsed into a summary)
			await expect(n8n.instanceAi.getToolCallSteps().first()).toBeVisible({ timeout: 10_000 });
		});
	},
);
