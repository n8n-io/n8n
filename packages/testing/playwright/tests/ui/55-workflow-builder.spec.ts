import { workflowBuilderEnabledRequirements } from '../../config/ai-builder-fixtures';
import { test, expect } from '../../fixtures/base';
import type { n8nPage } from '../../pages/n8nPage';

// Test timeout for AI generation tests (6 minutes)
const AI_GENERATION_TEST_TIMEOUT = 360000;

// Helper to get Anthropic API key from environment
const getAnthropicKey = () => {
	const testEnv = process.env.N8N_TEST_ENV;
	if (testEnv) {
		try {
			const config = JSON.parse(testEnv);
			return config.N8N_AI_ANTHROPIC_KEY ?? config.ANTHROPIC_API_KEY;
		} catch {
			return undefined;
		}
	}
	// Check N8N_AI_ANTHROPIC_KEY first (local development), then ANTHROPIC_API_KEY (CI)
	return process.env.N8N_AI_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
};

// Helper to open workflow builder and click first suggestion
async function openBuilderAndClickSuggestion(n8n: n8nPage) {
	await n8n.aiBuilder.getCanvasBuildWithAIButton().click();
	await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();
	await expect(n8n.aiBuilder.getWorkflowSuggestions()).toBeVisible();

	const firstPill = n8n.aiBuilder.getSuggestionPills().first();
	await firstPill.waitFor({ state: 'visible' });
	await firstPill.click();
	await n8n.page.keyboard.press('Enter');
}

// Pass the API key to the container if available (only works for containerized tests)
const apiKey = getAnthropicKey();
if (apiKey) {
	// Ensure N8N_AI_ANTHROPIC_KEY is set in the environment for the n8n service
	// This is needed because the service expects this specific variable name
	process.env.N8N_AI_ANTHROPIC_KEY ??= apiKey;

	// Also pass to container for containerized tests
	if (!process.env.N8N_BASE_URL) {
		test.use({
			addContainerCapability: {
				env: {
					N8N_AI_ANTHROPIC_KEY: apiKey,
				},
			},
		});
	}
}

test.describe('Workflow Builder @auth:owner', () => {
	test.beforeEach(async ({ setupRequirements }) => {
		await setupRequirements(workflowBuilderEnabledRequirements);
	});

	// Helper to check if Anthropic API key is available
	const hasAnthropicKey = () => !!getAnthropicKey();

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

	// Tests that require Anthropic API key (real AI workflow generation)
	test.describe('AI Generation (requires N8N_AI_ANTHROPIC_KEY)', () => {
		test.setTimeout(AI_GENERATION_TEST_TIMEOUT);

		test.beforeEach(function () {
			if (!hasAnthropicKey()) {
				test.skip();
			}
		});

		test('should build workflow from suggested prompt', async ({ n8n }) => {
			await n8n.page.goto('/workflow/new');
			await openBuilderAndClickSuggestion(n8n);

			await expect(n8n.aiAssistant.getChatMessagesUser().first()).toBeVisible();
			await n8n.aiAssistant.waitForStreamingComplete();
			await n8n.aiBuilder.waitForWorkflowBuildComplete();

			await expect(n8n.canvas.getCanvasNodes().first()).toBeVisible();

			const nodeCount = await n8n.canvas.getCanvasNodes().count();
			expect(nodeCount).toBeGreaterThan(0);
		});

		test('should display assistant messages during workflow generation', async ({ n8n }) => {
			await n8n.page.goto('/workflow/new');
			await openBuilderAndClickSuggestion(n8n);

			await expect(n8n.aiAssistant.getChatMessagesUser().first()).toBeVisible();
			await n8n.aiAssistant.waitForStreamingComplete();

			const assistantMessages = n8n.aiAssistant.getChatMessagesAssistant();
			await expect(assistantMessages.first()).toBeVisible();

			const messageCount = await assistantMessages.count();
			expect(messageCount).toBeGreaterThan(0);
		});

		test('should show user message in chat after clicking suggestion', async ({ n8n }) => {
			await n8n.page.goto('/workflow/new');
			await openBuilderAndClickSuggestion(n8n);

			await expect(n8n.aiAssistant.getChatMessagesUser().first()).toBeVisible();

			const messageText = await n8n.aiAssistant.getChatMessagesUser().first().textContent();
			expect(messageText?.trim().length).toBeGreaterThan(0);
		});

		test('should stop workflow generation and show task aborted message', async ({ n8n }) => {
			await n8n.page.goto('/workflow/new');
			await openBuilderAndClickSuggestion(n8n);

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

	test('should be able to close and reopen workflow builder', async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');

		await n8n.aiBuilder.getCanvasBuildWithAIButton().click();
		await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

		await n8n.aiAssistant.getCloseChatButton().click();
		await expect(n8n.aiAssistant.getAskAssistantChat()).toBeHidden();

		await n8n.aiBuilder.getCanvasBuildWithAIButton().click();
		await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

		await expect(n8n.aiBuilder.getWorkflowSuggestions()).toBeVisible();
	});
});
