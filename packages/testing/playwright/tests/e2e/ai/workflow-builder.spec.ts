import { workflowBuilderEnabledRequirements } from '../../../config/ai-builder-fixtures';
import { test, expect } from '../../../fixtures/base';
import type { n8nPage } from '../../../pages/n8nPage';

// Helper to open workflow builder and click a specific suggestion pill
async function openBuilderAndClickSuggestion(n8n: n8nPage, suggestionText: string) {
	await n8n.aiBuilder.getCanvasBuildWithAIButton().click();
	await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();
	await expect(n8n.aiBuilder.getWorkflowSuggestions()).toBeVisible();

	// Wait for suggestions to load
	await n8n.aiBuilder.getSuggestionPills().first().waitFor({ state: 'visible' });

	// Find and click the specific suggestion pill by text
	const targetPill = n8n.aiBuilder.getSuggestionPills().filter({ hasText: suggestionText });
	await expect(targetPill).toBeVisible();
	await targetPill.click();

	// Suggestion pill already populated the input, just submit with Enter
	await n8n.aiAssistant.sendMessage('', 'enter-key');
}

// Enable proxy server for recording/replaying Anthropic API calls
test.use({
	capability: {
		services: ['proxy'],
		env: {
			N8N_AI_ANTHROPIC_KEY: 'sk-ant-test-key-for-mocked-tests',
		},
	},
});

test.describe('Workflow Builder @auth:owner @ai @capability:proxy', () => {
	test.beforeEach(async ({ setupRequirements, proxyServer }) => {
		await setupRequirements(workflowBuilderEnabledRequirements);
		await proxyServer.clearAllExpectations();
		await proxyServer.loadExpectations('workflow-builder');
	});

	test('should show Build with AI button on empty canvas', async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');

		await expect(n8n.aiBuilder.getCanvasBuildWithAIButton()).toBeVisible();
	});

	test('should open workflow builder and show suggestions', async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');

		await n8n.aiBuilder.getCanvasBuildWithAIButton().click();

		await expect(n8n.aiAssistant.getAskAssistantSidebar()).toBeVisible();
		await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();
		await expect(n8n.aiBuilder.getWorkflowSuggestions()).toBeVisible();

		await n8n.aiBuilder.getSuggestionPills().first().waitFor({ state: 'visible' });
		const suggestions = n8n.aiBuilder.getSuggestionPills();
		await expect(suggestions).toHaveCount(8);
	});

	// @AI team to look at this
	test.fixme('should build workflow from suggested prompt @fixme', async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');
		await openBuilderAndClickSuggestion(n8n, 'YouTube video chapters');

		await expect(n8n.aiAssistant.getChatMessagesUser().first()).toBeVisible();

		// Wait for workflow to be built
		await n8n.aiBuilder.waitForWorkflowBuildComplete();

		await expect(n8n.canvas.getCanvasNodes().first()).toBeVisible();

		const nodeCount = await n8n.canvas.getCanvasNodes().count();
		expect(nodeCount).toBeGreaterThan(0);

		// Verify "Execute and refine" button appears after workflow is built
		await expect(n8n.page.getByRole('button', { name: 'Execute and refine' })).toBeVisible();
	});

	test('should display assistant messages during workflow generation', async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');
		await openBuilderAndClickSuggestion(n8n, 'YouTube video chapters');

		await expect(n8n.aiAssistant.getChatMessagesUser().first()).toBeVisible();
		await n8n.aiAssistant.waitForStreamingComplete();

		const assistantMessages = n8n.aiAssistant.getChatMessagesAssistant();
		await expect(assistantMessages.first()).toBeVisible();

		const messageCount = await assistantMessages.count();
		expect(messageCount).toBeGreaterThan(0);
	});

	test('should stop workflow generation and show task aborted message', async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');
		await openBuilderAndClickSuggestion(n8n, 'YouTube video chapters');

		await expect(n8n.aiAssistant.getChatMessagesUser().first()).toBeVisible();

		// Wait for streaming to start (assistant begins responding)
		await expect(n8n.aiAssistant.getChatMessagesAssistant().first()).toBeVisible({
			timeout: 30000,
		});

		// Click the stop button (send button becomes stop button during streaming)
		const stopButton = n8n.aiAssistant.getSendMessageButton();
		await stopButton.click();

		// Verify "Task aborted" message appears (search by text, not test-id)
		await expect(n8n.page.getByText('Task aborted')).toBeVisible();

		// Verify canvas returns to default state (no nodes added)
		const nodeCount = await n8n.canvas.getCanvasNodes().count();
		expect(nodeCount).toBe(0);

		// Verify the Build with AI button is still visible (canvas is back to default)
		await expect(n8n.aiBuilder.getCanvasBuildWithAIButton()).toBeVisible();
	});
});
