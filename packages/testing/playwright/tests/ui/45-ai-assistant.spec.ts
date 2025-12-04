import {
	simpleAssistantResponse,
	codeDiffSuggestionResponse,
	applyCodeDiffResponse,
	nodeExecutionSucceededResponse,
	aiDisabledRequirements,
	aiEnabledRequirements,
	aiEnabledWorkflowBaseRequirements,
	aiEnabledWithWorkflowRequirements,
	aiEnabledWithQuickRepliesRequirements,
	aiEnabledWithEndSessionRequirements,
	aiEnabledWithCodeDiffRequirements,
	aiEnabledWithSimpleChatRequirements,
	aiEnabledWithCodeSnippetRequirements,
	aiEnabledWithHttpWorkflowRequirements,
} from '../../config/ai-assistant-fixtures';
import {
	GMAIL_NODE_NAME,
	HTTP_REQUEST_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../config/constants';
import { test, expect } from '../../fixtures/base';

type ChatRequestBody = {
	payload?: {
		type?: string;
		text?: string;
		question?: string;
		context?: Record<string, unknown>;
	};
};

test.describe('AI Assistant::disabled', () => {
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

	test.describe('Support Chat', () => {
		test('assistant returns code snippet', async ({ n8n, setupRequirements }) => {
			await setupRequirements(aiEnabledWithCodeSnippetRequirements);
			await n8n.page.goto('/workflow/new');

			await expect(n8n.aiAssistant.getAskAssistantCanvasActionButton()).toBeVisible();
			await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();

			await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

			await n8n.aiAssistant.sendMessage('Show me an expression');

			await expect(n8n.aiAssistant.getChatMessagesAll()).toHaveCount(3);
			await expect(n8n.aiAssistant.getChatMessagesUser().first()).toContainText(
				'Show me an expression',
			);
			await expect(n8n.aiAssistant.getChatMessagesAssistant().first()).toContainText(
				'To use expressions in n8n, follow these steps:',
			);
			await expect(n8n.aiAssistant.getChatMessagesAssistant().first()).toContainText('New York');
			await expect(n8n.aiAssistant.getCodeSnippet()).toHaveText('{{$json.body.city}}');
		});

		test('should send current context to support chat', async ({ n8n, setupRequirements }) => {
			await setupRequirements(aiEnabledWithHttpWorkflowRequirements);

			const chatRequests: ChatRequestBody[] = [];
			await n8n.page.route('**/rest/ai/chat', async (route) => {
				const body = route.request().postDataJSON() as ChatRequestBody;
				chatRequests.push(body);
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(simpleAssistantResponse),
				});
			});

			await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();
			await n8n.aiAssistant.sendMessage('What is wrong with this workflow?');

			const supportRequest = chatRequests.find(
				(request) => request.payload?.question === 'What is wrong with this workflow?',
			);
			expect(supportRequest).toBeDefined();
			const supportContext = supportRequest?.payload?.context;
			expect(supportContext).toBeDefined();
			expect(supportContext?.currentView).toBeDefined();
			expect(supportContext?.currentWorkflow).toBeDefined();
		});

		test('should not send workflow context if nothing changed', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(aiEnabledWithHttpWorkflowRequirements);

			const chatRequests: ChatRequestBody[] = [];
			await n8n.page.route('**/rest/ai/chat', async (route) => {
				const body = route.request().postDataJSON() as ChatRequestBody;
				chatRequests.push(body);
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(simpleAssistantResponse),
				});
			});

			await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();

			await n8n.aiAssistant.sendMessage('What is wrong with this workflow?', 'enter-key');
			// Wait for message to be processed
			await expect(n8n.aiAssistant.getChatMessagesAssistant()).toHaveCount(1);

			await n8n.aiAssistant.sendMessage('And now?', 'enter-key');
			await expect(n8n.aiAssistant.getChatMessagesAssistant()).toHaveCount(2);
			const secondRequest = chatRequests.find((request) => request.payload?.text === 'And now?');
			const secondContext = secondRequest?.payload?.context;
			expect(secondContext?.currentWorkflow).toBeUndefined();

			await n8n.canvas.openNode(HTTP_REQUEST_NODE_NAME);
			await n8n.ndv.setParameterInputValue('url', 'https://example.com');
			await n8n.ndv.close();
			await n8n.canvas.clickExecuteWorkflowButton();

			await n8n.aiAssistant.sendMessage('What about now?', 'enter-key');
			await expect(n8n.aiAssistant.getChatMessagesAssistant()).toHaveCount(3);

			const thirdRequest = chatRequests.find(
				(request) => request.payload?.text === 'What about now?',
			);
			const thirdContext = thirdRequest?.payload?.context;
			expect(thirdContext?.currentWorkflow).toBeTruthy();
			expect(thirdContext?.executionData).toBeTruthy();
		});
	});

	test.describe('Code Node Error Help', () => {
		test('should apply code diff to code node', async ({ n8n, setupRequirements }) => {
			await setupRequirements(aiEnabledWithCodeDiffRequirements);

			let applySuggestionCalls = 0;
			await n8n.page.route('**/rest/ai/chat/apply-suggestion', async (route) => {
				applySuggestionCalls += 1;
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(applyCodeDiffResponse),
				});
			});

			await n8n.canvas.openNode('Code');

			await n8n.ndv.execute();

			await n8n.aiAssistant.getNodeErrorViewAssistantButton().click();

			await expect(n8n.aiAssistant.getChatMessagesAll()).toHaveCount(2);
			await expect(n8n.aiAssistant.getCodeDiffs()).toHaveCount(1);
			await expect(n8n.aiAssistant.getApplyCodeDiffButtons()).toHaveCount(1);

			await n8n.aiAssistant.getApplyCodeDiffButtons().first().click();

			await expect(n8n.aiAssistant.getApplyCodeDiffButtons()).toHaveCount(0);
			await expect(n8n.aiAssistant.getUndoReplaceCodeButtons()).toHaveCount(1);
			await expect(n8n.aiAssistant.getCodeReplacedMessage()).toBeVisible();
			await expect(n8n.ndv.getCodeEditor()).toContainText('item.json.myNewField = 1');

			await n8n.aiAssistant.getUndoReplaceCodeButtons().first().click();

			await expect(n8n.aiAssistant.getApplyCodeDiffButtons()).toHaveCount(1);
			await expect(n8n.aiAssistant.getCodeReplacedMessage()).toHaveCount(0);
			expect(applySuggestionCalls).toBe(1);
			await expect(n8n.ndv.getCodeEditor()).toContainText('item.json.myNewField = 1aaa');

			await n8n.aiAssistant.getApplyCodeDiffButtons().first().click();

			await expect(n8n.ndv.getCodeEditor()).toContainText('item.json.myNewField = 1');
		});

		test('should ignore node execution success and error messages after the node run successfully once', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(aiEnabledWorkflowBaseRequirements);

			let chatRequestCount = 0;
			await n8n.page.route('**/rest/ai/chat', async (route) => {
				chatRequestCount += 1;
				const response =
					chatRequestCount === 1 ? codeDiffSuggestionResponse : nodeExecutionSucceededResponse;
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(response),
				});
			});

			await n8n.canvas.openNode('Code');
			await n8n.ndv.execute();
			await n8n.aiAssistant.getNodeErrorViewAssistantButton().click();

			await n8n.ndv
				.getCodeEditor()
				.fill(
					"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\nfor (const item of $input.all()) {\n  item.json.myNewField = 1;\n}\n\nreturn $input.all();",
				);

			await n8n.ndv.execute();

			await n8n.ndv
				.getCodeEditor()
				.fill(
					"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\nfor (const item of $input.all()) {\n  item.json.myNewField = 1aaaa!;\n}\n\nreturn $input.all();",
				);

			await n8n.ndv.execute();

			await expect(n8n.aiAssistant.getChatMessagesAssistant().nth(2)).toContainText(
				'Code node ran successfully, did my solution help resolve your issue?',
			);
		});
	});

	test.describe('Credential Help', () => {
		test('should start credential help from node credential', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(aiEnabledWithSimpleChatRequirements);
			await n8n.page.goto('/workflow/new');

			await n8n.canvas.addInitialNodeToCanvas(SCHEDULE_TRIGGER_NODE_NAME);
			await n8n.ndv.clickBackToCanvasButton();
			await n8n.canvas.addNode(GMAIL_NODE_NAME, { action: 'Get many messages', closeNDV: false });

			await n8n.ndv.clickCreateNewCredential();

			await expect(n8n.canvas.credentialModal.getModal()).toBeVisible();

			const assistantButton = n8n.aiAssistant.getCredentialEditAssistantButton().locator('button');
			await expect(assistantButton).toBeVisible();
			await assistantButton.click();

			await expect(n8n.aiAssistant.getChatMessagesUser()).toHaveCount(1);
			await expect(n8n.aiAssistant.getChatMessagesUser().first()).toContainText(
				'How do I set up the credentials for Gmail OAuth2 API?',
			);
			await expect(n8n.aiAssistant.getChatMessagesAssistant().first()).toContainText(
				'Hey, this is an assistant message',
			);
			await expect(assistantButton).toBeDisabled();
		});

		test('should start credential help from credential list', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(aiEnabledWithSimpleChatRequirements);

			await n8n.navigate.toCredentials();

			await n8n.workflows.addResource.credential();
			await n8n.credentials.selectCredentialType('Notion API');

			const assistantButton = n8n.aiAssistant.getCredentialEditAssistantButton().locator('button');
			await expect(assistantButton).toBeVisible();
			await assistantButton.click();

			await expect(n8n.aiAssistant.getChatMessagesUser()).toHaveCount(1);
			await expect(n8n.aiAssistant.getChatMessagesUser().first()).toContainText(
				'How do I set up the credentials for Notion API?',
			);
			await expect(n8n.aiAssistant.getChatMessagesAssistant().first()).toContainText(
				'Hey, this is an assistant message',
			);
			await expect(assistantButton).toBeDisabled();
		});

		test('should not show assistant button if click to connect', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(aiEnabledRequirements);

			await n8n.page.route('**/types/credentials.json', async (route) => {
				const response = await route.fetch();
				const credentials = (await response.json()) as Array<
					{ name?: string } & Record<string, unknown>
				>;
				const index = credentials.findIndex((c) => c.name === 'slackOAuth2Api');
				if (index >= 0) {
					credentials[index] = {
						...credentials[index],
						__overwrittenProperties: ['clientId', 'clientSecret'],
					};
				}
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(credentials),
				});
			});

			await n8n.page.goto('/workflow/new');
			await n8n.canvas.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.addNode('Slack', { action: 'Get a channel' });

			await n8n.ndv.clickCreateNewCredential();

			const authOptions = n8n.canvas.credentialModal.getAuthTypeRadioButtons();
			await authOptions.first().click();

			await expect(n8n.canvas.credentialModal.oauthConnectButton).toHaveCount(1);
			await expect(n8n.canvas.credentialModal.getCredentialInputs()).toHaveCount(2);
			await expect(n8n.aiAssistant.getCredentialEditAssistantButton()).toHaveCount(0);

			await authOptions.nth(1).click();
			await expect(n8n.canvas.credentialModal.getCredentialInputs()).toHaveCount(4);
			await expect(n8n.aiAssistant.getCredentialEditAssistantButton()).toHaveCount(1);
		});

		test('should not show assistant button when click to connect with some fields', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(aiEnabledRequirements);

			await n8n.page.route('**/types/credentials.json', async (route) => {
				const response = await route.fetch();
				const credentials = (await response.json()) as Array<
					{ name?: string } & Record<string, unknown>
				>;
				const index = credentials.findIndex((c) => c.name === 'microsoftOutlookOAuth2Api');
				if (index >= 0) {
					credentials[index] = {
						...credentials[index],
						__overwrittenProperties: ['authUrl', 'accessTokenUrl', 'clientId', 'clientSecret'],
					};
				}
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(credentials),
				});
			});

			await n8n.page.goto('/workflow/new');
			await n8n.canvas.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.addNode('Microsoft Outlook', { action: 'Get a calendar' });

			await n8n.ndv.clickCreateNewCredential();

			await expect(n8n.canvas.credentialModal.oauthConnectButton).toHaveCount(1);
			await expect(n8n.canvas.credentialModal.getCredentialInputs()).toHaveCount(2);
			await expect(n8n.aiAssistant.getCredentialEditAssistantButton()).toHaveCount(0);
		});
	});
});
