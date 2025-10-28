import { workflowBuilderEnabledRequirements } from '../../config/ai-builder-fixtures';
import { test, expect } from '../../fixtures/base';

// Helper to get Anthropic API key from environment
// For test:local - set N8N_AI_ANTHROPIC_KEY when starting n8n locally
// For containerized tests - pass via N8N_TEST_ENV
const getAnthropicKey = () => {
	// Check if running in containerized mode
	const testEnv = process.env.N8N_TEST_ENV;
	if (testEnv) {
		try {
			const config = JSON.parse(testEnv);
			return config.N8N_AI_ANTHROPIC_KEY;
		} catch {
			return undefined;
		}
	}
	// For local testing, check the environment directly
	return process.env.N8N_AI_ANTHROPIC_KEY;
};

// Pass the API key to the container if available (only works for containerized tests)
const apiKey = getAnthropicKey();
if (apiKey && !process.env.N8N_BASE_URL) {
	test.use({
		addContainerCapability: {
			env: {
				N8N_AI_ANTHROPIC_KEY: apiKey,
			},
		},
	});
}

test.describe('Workflow Builder @auth:owner', () => {
	test.beforeEach(async ({ setupRequirements }) => {
		await setupRequirements(workflowBuilderEnabledRequirements);
	});

	// Helper to check if Anthropic API key is available
	const hasAnthropicKey = () => !!getAnthropicKey();

	test('should show Build with AI button on empty canvas', async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');

		// Verify the Build with AI button is visible on the canvas
		await expect(n8n.aiAssistant.getCanvasBuildWithAIButton()).toBeVisible();
	});

	test('should open workflow builder and show suggestions', async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');

		// Click the "Build with AI" button
		await n8n.aiAssistant.getCanvasBuildWithAIButton().click();

		// Verify the assistant sidebar opens
		await expect(n8n.aiAssistant.getAskAssistantSidebar()).toBeVisible();

		// Verify the chat interface is visible
		await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

		// Verify workflow suggestions are displayed
		await expect(n8n.aiAssistant.getWorkflowSuggestions()).toBeVisible();

		// Verify there are multiple suggestion pills (8 based on WORKFLOW_SUGGESTIONS constant)
		await n8n.aiAssistant.getSuggestionPills().first().waitFor({ state: 'visible' });
		const suggestions = n8n.aiAssistant.getSuggestionPills();
		await expect(suggestions).toHaveCount(8);
	});

	// Tests that require Anthropic API key (real AI workflow generation)
	test.describe('AI Generation (requires N8N_AI_ANTHROPIC_KEY)', () => {
		// Increase timeout for AI workflow generation tests (can take 5+ minutes)
		test.setTimeout(360000); // 6 minutes

		test.beforeEach(function () {
			if (!hasAnthropicKey()) {
				test.skip();
			}
		});

		test('should build workflow from suggested prompt', async ({ n8n }) => {
			await n8n.page.goto('/workflow/new');

			// Click the "Build with AI" button
			await n8n.aiAssistant.getCanvasBuildWithAIButton().click();

			// Wait for chat to be ready
			await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

			// Wait for suggestions to be ready
			await expect(n8n.aiAssistant.getWorkflowSuggestions()).toBeVisible();

			// Wait for at least one suggestion pill to be visible and enabled
			const firstPill = n8n.aiAssistant.getSuggestionPills().first();
			await firstPill.waitFor({ state: 'visible', timeout: 10000 });

			// Click the first suggestion to populate the input
			await firstPill.click();

			// Press Enter to submit the message
			await n8n.page.keyboard.press('Enter');

			// Wait for user message to appear
			await expect(n8n.aiAssistant.getChatMessagesUser().first()).toBeVisible({ timeout: 10000 });

			// Wait for the builder to finish streaming chat messages
			await n8n.aiAssistant.waitForStreamingComplete();

			// Wait for the workflow building to complete (can take up to 5 minutes)
			await n8n.aiAssistant.waitForWorkflowBuildComplete();

			// Verify that nodes have been added to the canvas
			await expect(n8n.canvas.getCanvasNodes().first()).toBeVisible({ timeout: 10000 });

			// Verify we have at least one node on the canvas
			const nodeCount = await n8n.canvas.getCanvasNodes().count();
			expect(nodeCount).toBeGreaterThan(0);
		});

		test('should display assistant messages during workflow generation', async ({ n8n }) => {
			await n8n.page.goto('/workflow/new');

			// Click the "Build with AI" button
			await n8n.aiAssistant.getCanvasBuildWithAIButton().click();

			// Wait for suggestions to be ready
			await expect(n8n.aiAssistant.getWorkflowSuggestions()).toBeVisible();

			// Wait for at least one suggestion pill to be visible and enabled
			const firstPill = n8n.aiAssistant.getSuggestionPills().first();
			await firstPill.waitFor({ state: 'visible', timeout: 10000 });

			// Click the first suggestion to populate the input
			await firstPill.click();

			// Press Enter to submit the message
			await n8n.page.keyboard.press('Enter');

			// Wait for user message to appear first
			await expect(n8n.aiAssistant.getChatMessagesUser().first()).toBeVisible({ timeout: 15000 });

			// Wait for streaming to complete
			await n8n.aiAssistant.waitForStreamingComplete();

			// Verify that at least one assistant message is displayed
			const assistantMessages = n8n.aiAssistant.getChatMessagesAssistant();
			await expect(assistantMessages.first()).toBeVisible();

			// Verify we have assistant messages (AI should respond)
			const messageCount = await assistantMessages.count();
			expect(messageCount).toBeGreaterThan(0);
		});

		test('should show user message in chat after clicking suggestion', async ({ n8n }) => {
			await n8n.page.goto('/workflow/new');

			// Click the "Build with AI" button
			await n8n.aiAssistant.getCanvasBuildWithAIButton().click();

			// Wait for suggestions to be ready
			await expect(n8n.aiAssistant.getWorkflowSuggestions()).toBeVisible();

			// Wait for at least one suggestion pill to be visible and enabled
			const firstPill = n8n.aiAssistant.getSuggestionPills().first();
			await firstPill.waitFor({ state: 'visible', timeout: 10000 });

			// Click the first suggestion to populate the input
			await firstPill.click();

			// Press Enter to submit the message
			await n8n.page.keyboard.press('Enter');

			// Verify user message appears
			await expect(n8n.aiAssistant.getChatMessagesUser().first()).toBeVisible({ timeout: 15000 });

			// Verify the user message has content (suggestion was sent)
			const messageText = await n8n.aiAssistant.getChatMessagesUser().first().textContent();
			expect(messageText?.trim().length).toBeGreaterThan(0);
		});
	});

	test('should be able to close and reopen workflow builder', async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');

		// Open the workflow builder
		await n8n.aiAssistant.getCanvasBuildWithAIButton().click();
		await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

		// Close the chat
		await n8n.aiAssistant.getCloseChatButton().click();
		await expect(n8n.aiAssistant.getAskAssistantChat()).toBeHidden();

		// Reopen the workflow builder
		await n8n.aiAssistant.getCanvasBuildWithAIButton().click();
		await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

		// Suggestions should still be visible
		await expect(n8n.aiAssistant.getWorkflowSuggestions()).toBeVisible();
	});
});
