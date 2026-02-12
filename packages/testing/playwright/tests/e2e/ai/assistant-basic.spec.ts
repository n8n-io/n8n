import {
	simpleAssistantResponse,
	aiDisabledRequirements,
	aiEnabledRequirements,
	aiEnabledWithWorkflowRequirements,
	aiEnabledWithQuickRepliesRequirements,
	aiEnabledWithEndSessionRequirements,
	aiEnabledWithSimpleChatRequirements,
} from '../../../config/ai-assistant-fixtures';
import { SCHEDULE_TRIGGER_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

type ChatRequestBody = {
	payload?: {
		type?: string;
		text?: string;
		question?: string;
		context?: Record<string, unknown>;
	};
};

test.describe('AI Assistant::disabled', {
	annotation: [
		{ type: 'owner', description: 'AI' },
	],
}, () => {
	test('does not show assistant button if feature is disabled', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements(aiDisabledRequirements);
		await n8n.page.goto('/workflow/new');
		await expect(n8n.canvas.canvasPane()).toBeVisible();
		await expect(n8n.aiAssistant.getAskAssistantFloatingButton()).toHaveCount(0);
	});
});

test.describe('AI Assistant::enabled', () => {
	test('renders placeholder UI', async ({ n8n, setupRequirements }) => {
		await setupRequirements(aiEnabledRequirements);
		await n8n.page.goto('/workflow/new');

		await expect(n8n.aiAssistant.getAskAssistantCanvasActionButton()).toBeVisible();

		await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();

		await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

		await expect(n8n.aiAssistant.getPlaceholderMessage()).toBeVisible();

		await expect(n8n.aiAssistant.getChatInput()).toBeVisible();

		await expect(n8n.aiAssistant.getSendMessageButton()).toBeDisabled();

		await expect(n8n.aiAssistant.getCloseChatButton()).toBeVisible();

		await n8n.aiAssistant.getCloseChatButton().click();

		await expect(n8n.aiAssistant.getAskAssistantChat()).toBeHidden();
	});

	test('should show resizer when chat is open', async ({ n8n, setupRequirements }) => {
		await setupRequirements(aiEnabledRequirements);
		await n8n.page.goto('/workflow/new');

		await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();

		await expect(n8n.aiAssistant.getAskAssistantSidebarResizer()).toBeVisible();

		await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

		await n8n.aiAssistant.getAskAssistantSidebarResizer().hover();

		await n8n.aiAssistant.getCloseChatButton().click();
	});

	test('should start chat session from node error view', async ({ n8n, setupRequirements }) => {
		await setupRequirements(aiEnabledWithWorkflowRequirements);

		await n8n.canvas.openNode('Stop and Error');

		await n8n.ndv.execute();

		await expect(n8n.aiAssistant.getNodeErrorViewAssistantButton()).toBeVisible();
		await expect(n8n.aiAssistant.getNodeErrorViewAssistantButton()).toBeEnabled();

		await n8n.aiAssistant.getNodeErrorViewAssistantButton().click();

		await expect(n8n.aiAssistant.getChatMessagesAll()).toHaveCount(1);

		await expect(n8n.aiAssistant.getChatMessagesAll().first()).toContainText(
			'Hey, this is an assistant message',
		);
	});

	test('should render chat input correctly', async ({ n8n, setupRequirements }) => {
		await setupRequirements(aiEnabledWithWorkflowRequirements);

		await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();

		await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();
		await expect(n8n.aiAssistant.getChatInput()).toBeVisible();

		await expect(n8n.aiAssistant.getSendMessageButton()).toBeDisabled();

		await n8n.aiAssistant.getChatInput().fill('Test message');

		await expect(n8n.aiAssistant.getChatInput()).toHaveValue('Test message');

		await expect(n8n.aiAssistant.getSendMessageButton()).toBeEnabled();

		await n8n.aiAssistant.getSendMessageButton().click();

		await expect(n8n.aiAssistant.getChatMessagesUser()).toHaveCount(1);

		await expect(n8n.aiAssistant.getChatMessagesUser()).toHaveCount(1);

		await expect(n8n.aiAssistant.getChatInput()).toHaveValue('');
	});

	test('should render and handle quick replies', async ({ n8n, setupRequirements }) => {
		await setupRequirements(aiEnabledWithQuickRepliesRequirements);

		await n8n.canvas.openNode('Stop and Error');

		await n8n.ndv.execute();

		await n8n.aiAssistant.getNodeErrorViewAssistantButton().click();

		await expect(n8n.aiAssistant.getQuickReplyButtons()).toHaveCount(2);

		await expect(n8n.aiAssistant.getQuickReplyButtons()).toHaveCount(2);

		await n8n.aiAssistant.getQuickReplyButtons().first().click();

		await expect(n8n.aiAssistant.getChatMessagesUser()).toHaveCount(1);

		await expect(n8n.aiAssistant.getChatMessagesUser()).toHaveCount(1);

		await expect(n8n.aiAssistant.getChatMessagesUser().first()).toContainText("Sure, let's do it");
	});

	test('should warn before starting a new session', async ({ n8n, setupRequirements }) => {
		await setupRequirements(aiEnabledWithWorkflowRequirements);

		await n8n.canvas.openNode('Edit Fields');

		await n8n.ndv.execute();

		await n8n.aiAssistant.getNodeErrorViewAssistantButton().click();

		await expect(n8n.aiAssistant.getChatMessagesAll()).toHaveCount(1);

		await n8n.aiAssistant.getCloseChatButton().click();

		await n8n.ndv.clickBackToCanvasButton();

		await n8n.canvas.openNode('Stop and Error');

		await n8n.ndv.execute();

		await n8n.aiAssistant.getNodeErrorViewAssistantButton().click();

		await expect(n8n.aiAssistant.getNewAssistantSessionModal()).toBeVisible();

		await n8n.aiAssistant
			.getNewAssistantSessionModal()
			.getByRole('button', { name: 'Start new session' })
			.click();

		await expect(n8n.aiAssistant.getChatMessagesAll()).toHaveCount(1);
	});

	test('should end chat session when `end_session` event is received', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements(aiEnabledWithEndSessionRequirements);

		await n8n.canvas.openNode('Stop and Error');

		await n8n.ndv.execute();

		await n8n.aiAssistant.getNodeErrorViewAssistantButton().click();

		await expect(n8n.aiAssistant.getChatMessagesSystem()).toHaveCount(1);

		await expect(n8n.aiAssistant.getChatMessagesSystem()).toHaveCount(1);

		await expect(n8n.aiAssistant.getChatMessagesSystem().first()).toContainText(
			'session has ended',
		);
	});

	test('should reset session after it ended and sidebar is closed', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements(aiEnabledRequirements);
		await n8n.page.goto('/workflow/new');

		await n8n.page.route('**/rest/ai/chat', async (route) => {
			const requestBody = route.request().postDataJSON() as ChatRequestBody;
			const isInit = requestBody.payload?.type === 'init-support-chat';
			const response = isInit
				? simpleAssistantResponse
				: {
						sessionId: '1',
						messages: [
							{
								role: 'assistant',
								type: 'message',
								title: 'Glad to Help',
								text: "I'm glad I could help. If you have any more questions or need further assistance with your n8n workflows, feel free to ask!",
							},
							{
								role: 'assistant',
								type: 'event',
								eventName: 'end-session',
							},
						],
					};
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(response),
			});
		});

		await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();
		await n8n.aiAssistant.sendMessage('Hello', 'enter-key');

		await expect(n8n.aiAssistant.getChatMessagesAll()).toHaveCount(2);

		await n8n.aiAssistant.getCloseChatButton().click();
		// Wait for sidebar to close
		await expect(n8n.aiAssistant.getAskAssistantChat()).toBeHidden();
		await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();
		await expect(n8n.aiAssistant.getChatMessagesAll()).toHaveCount(2);

		await n8n.aiAssistant.sendMessage('Thanks, bye', 'enter-key');

		await expect(n8n.aiAssistant.getChatMessagesSystem()).toHaveCount(1);
		await expect(n8n.aiAssistant.getChatMessagesSystem().first()).toContainText(
			'session has ended',
		);

		await n8n.aiAssistant.getCloseChatButton().click();
		await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();
		await expect(n8n.aiAssistant.getPlaceholderMessage()).toBeVisible();
	});

	test('should not reset assistant session when workflow is saved', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements(aiEnabledWithSimpleChatRequirements);
		await n8n.page.goto('/workflow/new');

		await n8n.canvas.addInitialNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		await n8n.ndv.clickBackToCanvasButton();

		await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();
		await n8n.aiAssistant.sendMessage('Hello', 'enter-key');

		await expect(n8n.aiAssistant.getChatMessagesUser()).toHaveCount(1);

		await n8n.canvas.openNode(SCHEDULE_TRIGGER_NODE_NAME);
		await n8n.ndv.execute();

		await expect(n8n.aiAssistant.getPlaceholderMessage()).toHaveCount(0);
	});

	test('should send message via shift + enter even with global NodeCreator panel opened', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements(aiEnabledWithSimpleChatRequirements);
		await n8n.page.goto('/workflow/new');

		await n8n.canvas.addInitialNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
		await n8n.ndv.clickBackToCanvasButton();

		await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();
		await n8n.canvas.nodeCreator.open();

		await n8n.aiAssistant.sendMessage('Hello', 'enter-key');

		await expect(n8n.aiAssistant.getPlaceholderMessage()).toHaveCount(0);
		await expect(n8n.aiAssistant.getChatMessagesUser()).toHaveCount(1);
	});
});
