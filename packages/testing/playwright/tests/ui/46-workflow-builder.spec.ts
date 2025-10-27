import { test, expect } from '../../fixtures/base';
import {
	workflowBuilderEnabledRequirements,
	workflowBuilderGenerationResponse,
} from '../../config/ai-builder-fixtures';

test.describe('Workflow Builder @auth:owner', () => {
	test.beforeEach(async ({ n8n, setupRequirements }) => {
		await setupRequirements(workflowBuilderEnabledRequirements);

		// Mock the builder credits endpoint
		await n8n.page.route('**/rest/ai/build/credits', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					creditsQuota: 100,
					creditsClaimed: 0,
				}),
			});
		});

		// Mock the sessions metadata endpoint
		await n8n.page.route('**/rest/ai/sessions/metadata', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					hasMessages: false,
				}),
			});
		});

		// Mock the sessions endpoint
		await n8n.page.route('**/rest/ai/sessions', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					sessions: [],
				}),
			});
		});

		// Mock workflow save/create endpoint
		await n8n.page.route('**/rest/workflows/**', async (route) => {
			const method = route.request().method();
			if (method === 'POST' || method === 'PATCH') {
				// Return a mock workflow with an ID
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						id: 'test-workflow-123',
						name: 'My workflow',
						nodes: [],
						connections: {},
						active: false,
						settings: {},
						versionId: '1',
					}),
				});
			} else {
				await route.continue();
			}
		});
	});

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
		// Wait for the first pill to be enabled before counting
		await n8n.aiAssistant.getSuggestionPills().first().waitFor({ state: 'visible' });
		const suggestions = n8n.aiAssistant.getSuggestionPills();
		await expect(suggestions).toHaveCount(8);
	});

	test('should build workflow from suggested prompt', async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');

		let builderRequestMade = false;

		// Mock the workflow builder API response
		await n8n.page.route('**/rest/ai/build', async (route) => {
			builderRequestMade = true;
			console.log('Builder API route hit!');
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(workflowBuilderGenerationResponse),
			});
		});

		// Click the "Build with AI" button
		await n8n.aiAssistant.getCanvasBuildWithAIButton().click();

		// Wait for suggestions to be visible
		await expect(n8n.aiAssistant.getWorkflowSuggestions()).toBeVisible();

		// Send a message directly instead of clicking a suggestion
		await n8n.aiAssistant.sendMessage('Create a simple workflow with HTTP Request');

		// Wait a bit for the API call to be made
		await n8n.page.waitForTimeout(3000);

		// Check if the API was called
		if (!builderRequestMade) {
			throw new Error('Builder API was never called');
		}

		// Wait for user message to appear
		await expect(n8n.aiAssistant.getChatMessagesUser()).toHaveCount(1);

		// Wait for assistant response
		await expect(n8n.aiAssistant.getChatMessagesAssistant().first()).toBeVisible({
			timeout: 10000,
		});

		// Verify that nodes have been added to the canvas
		// The mock response includes 2 nodes: Manual Trigger and HTTP Request
		await expect(n8n.canvas.nodeByName('Manual Trigger')).toBeVisible();
		await expect(n8n.canvas.nodeByName('HTTP Request')).toBeVisible();

		// Verify there are exactly 2 nodes on the canvas
		await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
	});

	test('should build workflow by clicking specific suggestion', async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');

		// Mock the workflow builder API response
		await n8n.page.route('**/rest/ai/build', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(workflowBuilderGenerationResponse),
			});
		});

		// Click the "Build with AI" button
		await n8n.aiAssistant.getCanvasBuildWithAIButton().click();

		// Wait for suggestions to be visible
		await expect(n8n.aiAssistant.getWorkflowSuggestions()).toBeVisible();

		// Click a specific suggestion by text
		await n8n.aiAssistant.clickSuggestionByText('Invoice processing pipeline');

		// Wait for the builder to finish streaming
		await n8n.aiAssistant.waitForStreamingComplete();

		// Verify workflow was created
		await expect(n8n.canvas.nodeByName('Manual Trigger')).toBeVisible();
		await expect(n8n.canvas.nodeByName('HTTP Request')).toBeVisible();
	});

	test('should display assistant messages during workflow generation', async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');

		// Mock the workflow builder API response
		await n8n.page.route('**/rest/ai/build', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(workflowBuilderGenerationResponse),
			});
		});

		// Click the "Build with AI" button
		await n8n.aiAssistant.getCanvasBuildWithAIButton().click();

		// Click a suggestion
		await n8n.aiAssistant.getSuggestionPills().first().click();

		// Wait for streaming to complete
		await n8n.aiAssistant.waitForStreamingComplete();

		// Verify that assistant messages are displayed
		const assistantMessages = n8n.aiAssistant.getChatMessagesAssistant();
		await expect(assistantMessages).toHaveCount(1);

		// Verify the final assistant message content
		await expect(assistantMessages.first()).toContainText(
			"I've created a workflow with a Manual Trigger and an HTTP Request node",
		);
	});

	test('should show user message in chat after clicking suggestion', async ({ n8n }) => {
		await n8n.page.goto('/workflow/new');

		// Mock the workflow builder API response
		await n8n.page.route('**/rest/ai/build', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(workflowBuilderGenerationResponse),
			});
		});

		// Click the "Build with AI" button
		await n8n.aiAssistant.getCanvasBuildWithAIButton().click();

		// Click a suggestion
		await n8n.aiAssistant.getSuggestionPills().first().click();

		// Verify user message appears
		const userMessages = n8n.aiAssistant.getChatMessagesUser();
		await expect(userMessages).toHaveCount(1);

		// The user message should contain the prompt text from the suggestion
		await expect(userMessages.first()).toContainText('Create an invoice parsing workflow');
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
