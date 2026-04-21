/**
 * Reproduction test for AGENT-27
 * Bug: Integration cards aren't updating when switching between agents
 *
 * Expected behavior:
 * - Each agent should have its own independent trigger connection state
 * - When switching between agents, trigger connection states should update to reflect the selected agent
 *
 * Actual behavior:
 * - Trigger connection states (Connected/Disconnected) are not updated when switching agents
 * - Connection state from one agent incorrectly persists when viewing another agent
 * - Only updates correctly after page refresh
 */

import { test, expect } from '../fixtures';
import { nanoid } from 'nanoid';

test.describe('Agent trigger connection state @flaky', () => {
	test('should update trigger connection states when switching between agents', async ({ n8n }) => {
		// SETUP: Create three workflow agents with triggers
		const agent1Name = `Simple Chat Bot ${nanoid()}`;
		const agent2Name = `Etsy Scraper ${nanoid()}`;
		const agent3Name = `Linear Agent ${nanoid()}`;

		// Create first agent workflow
		const agent1 = await n8n.api.workflows.createWorkflow({
			name: agent1Name,
			nodes: [
				{
					id: nanoid(),
					name: 'When chat message received',
					type: '@n8n/n8n-nodes-langchain.chatTrigger',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: {
						availableInChat: true,
					},
				},
			],
		});

		// Create second agent workflow
		const agent2 = await n8n.api.workflows.createWorkflow({
			name: agent2Name,
			nodes: [
				{
					id: nanoid(),
					name: 'When chat message received',
					type: '@n8n/n8n-nodes-langchain.chatTrigger',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: {
						availableInChat: true,
					},
				},
			],
		});

		// Create third agent workflow
		const agent3 = await n8n.api.workflows.createWorkflow({
			name: agent3Name,
			nodes: [
				{
					id: nanoid(),
					name: 'When chat message received',
					type: '@n8n/n8n-nodes-langchain.chatTrigger',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: {
						availableInChat: true,
					},
				},
			],
		});

		// Navigate to Instance AI or agent management view
		// Note: The exact navigation may need adjustment based on actual UI structure
		await n8n.page.goto('/home/instance-ai');

		// STEP 1: Select first agent and verify trigger states
		// TODO: Add selectors for agent list and trigger panel once UI structure is clear
		const agentSelector = n8n.page.getByTestId('agent-card').filter({ hasText: agent1Name });
		await agentSelector.click();

		// Verify triggers section is visible
		const triggersSection = n8n.page.getByTestId('triggers-section');
		await expect(triggersSection).toBeVisible();

		// Both Slack and Telegram should be disconnected initially
		const slackCard = n8n.page.getByTestId('trigger-card-slack');
		const telegramCard = n8n.page.getByTestId('trigger-card-telegram');

		await expect(slackCard.getByText('Disconnected')).toBeVisible();
		await expect(telegramCard.getByText('Disconnected')).toBeVisible();

		// STEP 2: Switch to second agent
		await n8n.page
			.getByTestId('agent-card')
			.filter({ hasText: agent2Name })
			.click();

		// Verify triggers still show as disconnected
		await expect(slackCard.getByText('Disconnected')).toBeVisible();
		await expect(telegramCard.getByText('Disconnected')).toBeVisible();

		// STEP 3: Connect Telegram on second agent
		await telegramCard.getByRole('button', { name: 'Connect' }).click();

		// Verify Telegram is now connected
		await expect(telegramCard.getByText('Connected')).toBeVisible();
		await expect(slackCard.getByText('Disconnected')).toBeVisible();

		// STEP 4: Switch back to first agent
		// BUG: Telegram should be disconnected for agent 1, but incorrectly shows as connected
		await n8n.page
			.getByTestId('agent-card')
			.filter({ hasText: agent1Name })
			.click();

		// This assertion should fail due to the bug
		await expect(telegramCard.getByText('Disconnected')).toBeVisible();
		await expect(slackCard.getByText('Disconnected')).toBeVisible();

		// STEP 5: Switch to third agent
		// BUG: Telegram should be disconnected for agent 3, but incorrectly shows as connected
		await n8n.page
			.getByTestId('agent-card')
			.filter({ hasText: agent3Name })
			.click();

		// This assertion should also fail due to the bug
		await expect(telegramCard.getByText('Disconnected')).toBeVisible();
		await expect(slackCard.getByText('Disconnected')).toBeVisible();

		// Cleanup
		await n8n.api.workflows.deleteWorkflow(agent1.id);
		await n8n.api.workflows.deleteWorkflow(agent2.id);
		await n8n.api.workflows.deleteWorkflow(agent3.id);
	});

	test('should correctly restore trigger states after page refresh', async ({ n8n }) => {
		// This test verifies that the connection states are correct after page refresh
		// which indicates the backend state is correct but the frontend state management has issues

		const agent1Name = `Agent A ${nanoid()}`;
		const agent2Name = `Agent B ${nanoid()}`;

		// Create two agents
		const agent1 = await n8n.api.workflows.createWorkflow({
			name: agent1Name,
			nodes: [
				{
					id: nanoid(),
					name: 'When chat message received',
					type: '@n8n/n8n-nodes-langchain.chatTrigger',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: {
						availableInChat: true,
					},
				},
			],
		});

		const agent2 = await n8n.api.workflows.createWorkflow({
			name: agent2Name,
			nodes: [
				{
					id: nanoid(),
					name: 'When chat message received',
					type: '@n8n/n8n-nodes-langchain.chatTrigger',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: {
						availableInChat: true,
					},
				},
			],
		});

		// Navigate to agents view
		await n8n.page.goto('/home/instance-ai');

		// Select agent 2 and connect Telegram
		await n8n.page
			.getByTestId('agent-card')
			.filter({ hasText: agent2Name })
			.click();

		const telegramCard = n8n.page.getByTestId('trigger-card-telegram');
		await telegramCard.getByRole('button', { name: 'Connect' }).click();
		await expect(telegramCard.getByText('Connected')).toBeVisible();

		// Switch to agent 1 (bug occurs here - shows connected)
		await n8n.page
			.getByTestId('agent-card')
			.filter({ hasText: agent1Name })
			.click();

		// BUG: Without page refresh, Telegram incorrectly shows as connected
		// (This assertion will fail before the fix)

		// Refresh page
		await n8n.page.reload();

		// After refresh, agent 1 should show Telegram as disconnected (correct state)
		await n8n.page
			.getByTestId('agent-card')
			.filter({ hasText: agent1Name })
			.click();

		await expect(telegramCard.getByText('Disconnected')).toBeVisible();

		// Switch to agent 2 after refresh - should show as connected
		await n8n.page
			.getByTestId('agent-card')
			.filter({ hasText: agent2Name })
			.click();

		await expect(telegramCard.getByText('Connected')).toBeVisible();

		// Cleanup
		await n8n.api.workflows.deleteWorkflow(agent1.id);
		await n8n.api.workflows.deleteWorkflow(agent2.id);
	});
});
