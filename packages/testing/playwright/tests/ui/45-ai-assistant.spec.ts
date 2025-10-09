import {
	GMAIL_NODE_NAME,
	HTTP_REQUEST_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	SCHEDULE_TRIGGER_NODE_NAME,
} from '../../config/constants';
import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';

type ChatRequestBody = {
	payload?: {
		type?: string;
		text?: string;
		question?: string;
		context?: Record<string, unknown>;
	};
};

// #region Mock AI Responses

const simpleAssistantResponse = {
	sessionId: '1',
	messages: [
		{
			role: 'assistant',
			type: 'message',
			text: 'Hey, this is an assistant message',
		},
	],
};

const codeDiffSuggestionResponse = {
	sessionId: '1',
	messages: [
		{
			role: 'assistant',
			type: 'message',
			text: 'Hi there! Here is my top solution to fix the error in your **Code** node 👇',
		},
		{
			role: 'assistant',
			type: 'code-diff',
			description:
				"Fix the syntax error by changing '1asd' to a valid value. In this case, it seems like '1' was intended.",
			suggestionId: '1',
			codeDiff:
				'@@ -2,2 +2,2 @@\\n   item.json.myNewField = 1asd;\\n+  item.json.myNewField = 1;\\n',
			quickReplies: [
				{
					text: 'Give me another solution',
					type: 'new-suggestion',
				},
			],
		},
	],
};

const applyCodeDiffResponse = {
	data: {
		sessionId:
			'f9130bd7-c078-4862-a38a-369b27b0ff20-e96eb9f7-d581-4684-b6a9-fd3dfe9fe1fb-emTezIGat7bQsDdtIlbti',
		parameters: {
			jsCode:
				"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\\nfor (const item of $input.all()) {\\n  item.json.myNewField = 1;\\n}\\n\\nreturn $input.all();",
		},
	},
};

const nodeExecutionSucceededResponse = {
	sessionId: '1',
	messages: [
		{
			role: 'assistant',
			type: 'message',
			text: '**Code** node ran successfully, did my solution help resolve your issue?',
			quickReplies: [
				{
					text: 'Yes, thanks',
					type: 'all-good',
					isFeedback: true,
				},
				{
					text: 'No, I am still stuck',
					type: 'still-stuck',
					isFeedback: true,
				},
			],
		},
	],
};

const codeSnippetAssistantResponse = {
	sessionId:
		'f1d19ed5-0d55-4bad-b49a-f0c56bd6f76f-705b5dbf-12d4-4805-87a3-1e5b3c716d29-W1JgVNrpfitpSNF9rAjB4',
	messages: [
		{
			role: 'assistant',
			type: 'message',
			text: 'To use expressions in n8n, follow these steps:\\n\\n1. Hover over the parameter where you want to use an expression.\\n2. Select **Expressions** in the **Fixed/Expression** toggle.\\n3. Write your expression in the parameter, or select **Open expression editor** to open the expressions editor. You can browse the available data in the **Variable selector**. All expressions have the format `{{ your expression here }}`.\\n\\n### Example: Get data from webhook body\\n\\nIf your webhook data looks like this:\\n\\n```json\\n[\\n  {\\n    \\"headers\\": {\\n      \\"host\\": \\"n8n.instance.address\\",\\n      ...\\n    },\\n    \\"params\\": {},\\n    \\"query\\": {},\\n    \\"body\\": {\\n      \\"name\\": \\"Jim\\",\\n      \\"age\\": 30,\\n      \\"city\\": \\"New York\\"\\n    }\\n  }\\n]\\n```\\n\\nYou can use the following expression to get the value of `city`:\\n\\n```js\\n{{$json.body.city}}\\n```\\n\\nThis expression accesses the incoming JSON-formatted data using n8n\'s custom `$json` variable and finds the value of `city` (in this example, \\"New York\\").',
			codeSnippet: '{{$json.body.city}}',
		},
		{
			role: 'assistant',
			type: 'message',
			text: 'Did this answer solve your question?',
			quickReplies: [
				{
					text: 'Yes, thanks',
					type: 'all-good',
					isFeedback: true,
				},
				{
					text: 'No, I am still stuck',
					type: 'still-stuck',
					isFeedback: true,
				},
			],
		},
	],
};

// #endregion

// #region Test Requirements for different scenarios

const aiDisabledRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: false, setup: false },
		},
		features: { aiAssistant: false },
	},
};

const aiEnabledRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
		},
		features: { aiAssistant: true, setup: true },
	},
};

const aiEnabledWithWorkflowRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
		},
		features: { aiAssistant: true, setup: true },
	},
	workflow: {
		'ai_assistant_test_workflow.json': 'AI_Assistant_Test_Workflow',
	},
	intercepts: {
		aiChat: {
			url: '**/rest/ai/chat',
			response: simpleAssistantResponse,
		},
	},
};

const aiEnabledWithQuickRepliesRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
		},
		features: { aiAssistant: true },
	},
	workflow: {
		'ai_assistant_test_workflow.json': 'AI_Assistant_Test_Workflow',
	},
	intercepts: {
		aiChat: {
			url: '**/rest/ai/chat',
			response: {
				sessionId: '1',
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: 'Hey, this is an assistant message',
						quickReplies: [
							{
								text: "Sure, let's do it",
								type: 'yes',
							},
							{
								text: "Nah, doesn't sound good",
								type: 'no',
							},
						],
					},
				],
			},
		},
	},
};

const aiEnabledWithEndSessionRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
		},
		features: { aiAssistant: true },
	},
	workflow: {
		'ai_assistant_test_workflow.json': 'AI_Assistant_Test_Workflow',
	},
	intercepts: {
		aiChat: {
			url: '**/rest/ai/chat',
			response: {
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
			},
		},
	},
};

const aiEnabledWorkflowBaseRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
		},
		features: { aiAssistant: true, setup: true },
	},
	workflow: {
		'ai_assistant_test_workflow.json': 'AI_Assistant_Test_Workflow',
	},
};

const aiEnabledWithCodeDiffRequirements: TestRequirements = {
	...aiEnabledWorkflowBaseRequirements,
	intercepts: {
		aiChat: {
			url: '**/rest/ai/chat',
			response: codeDiffSuggestionResponse,
		},
	},
};

const aiEnabledWithSimpleChatRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
		},
		features: { aiAssistant: true, setup: true },
	},
	intercepts: {
		aiChat: {
			url: '**/rest/ai/chat',
			response: simpleAssistantResponse,
		},
	},
};

const aiEnabledWithCodeSnippetRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
		},
		features: { aiAssistant: true, setup: true },
	},
	intercepts: {
		aiChat: {
			url: '**/rest/ai/chat',
			response: codeSnippetAssistantResponse,
		},
	},
};

const aiEnabledWithHttpWorkflowRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
		},
		features: { aiAssistant: true, setup: true },
	},
	workflow: {
		'Simple_workflow_with_http_node.json': 'Simple HTTP Workflow',
	},
};

// #endregion

test.describe('AI Assistant::disabled', () => {
	test('does not show assistant button if feature is disabled', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements(aiDisabledRequirements);
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

		await expect(n8n.aiAssistant.getChatMessagesAll()).toHaveCount(1);

		await expect(n8n.aiAssistant.getChatMessagesAll().first()).toContainText(
			'Hey, this is an assistant message',
		);

		await expect(n8n.aiAssistant.getNodeErrorViewAssistantButton()).toBeDisabled();
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

		await expect(n8n.aiAssistant.getChatMessagesAll()).toHaveCount(1);
	});

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

		await expect(n8n.aiAssistant.getChatMessagesAssistant()).toHaveCount(2);

		await n8n.ndv
			.getCodeEditor()
			.fill(
				"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\nfor (const item of $input.all()) {\n  item.json.myNewField = 1;\n}\n\nreturn $input.all();",
			);

		await n8n.ndv.execute();

		await expect(n8n.aiAssistant.getChatMessagesAssistant()).toHaveCount(3);

		await n8n.ndv
			.getCodeEditor()
			.fill(
				"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\nfor (const item of $input.all()) {\n  item.json.myNewField = 1aaaa!;\n}\n\nreturn $input.all();",
			);

		await n8n.ndv.execute();

		await expect(n8n.aiAssistant.getChatMessagesAssistant()).toHaveCount(3);
		await expect(n8n.aiAssistant.getChatMessagesAssistant().nth(2)).toContainText(
			'Code node ran successfully, did my solution help resolve your issue?',
		);
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

		const chatInput = n8n.aiAssistant.getChatInput();
		await chatInput.fill('Hello');
		await chatInput.press('Shift+Enter');

		await expect(n8n.aiAssistant.getChatMessagesAll()).toHaveCount(2);

		await n8n.aiAssistant.getCloseChatButton().click();
		await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();
		await expect(n8n.aiAssistant.getChatMessagesAll()).toHaveCount(2);

		await chatInput.fill('Thanks, bye');
		await chatInput.press('Shift+Enter');

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
		const chatInput = n8n.aiAssistant.getChatInput();
		await chatInput.fill('Hello');
		await chatInput.press('Shift+Enter');

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
		// TODO: Updated the selector here, check if other tests still work
		await n8n.canvas.nodeCreator.open();

		const chatInput = n8n.aiAssistant.getChatInput();
		await chatInput.fill('Hello');
		await chatInput.press('Shift+Enter');

		await expect(n8n.aiAssistant.getPlaceholderMessage()).toHaveCount(0);
		await expect(n8n.aiAssistant.getChatMessagesUser()).toHaveCount(1);
	});

	test.describe('General help', () => {
		test('assistant returns code snippet', async ({ n8n, setupRequirements }) => {
			await setupRequirements(aiEnabledWithCodeSnippetRequirements);
			await n8n.page.goto('/workflow/new');

			await expect(n8n.aiAssistant.getAskAssistantCanvasActionButton()).toBeVisible();
			await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();

			await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();

			await n8n.aiAssistant.getChatInput().fill('Show me an expression');
			await n8n.aiAssistant.getSendMessageButton().click();

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
			await n8n.aiAssistant.getChatInput().fill('What is wrong with this workflow?');
			await n8n.aiAssistant.getSendMessageButton().click();

			console.log(chatRequests);
			const supportRequest = chatRequests.find(
				(request) => request.payload?.question === 'What is wrong with this workflow?',
			);
			expect(supportRequest).toBeDefined();
			const supportContext = supportRequest?.payload?.context;
			expect(supportContext).toBeDefined();
			expect((supportContext?.currentView as { name?: string } | undefined)?.name).toBe(
				'NodeViewExisting',
			);
			expect(supportContext).toHaveProperty('currentWorkflow');
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

			// TODO: Move this to page action
			const sendMessage = async (text: string) => {
				await n8n.aiAssistant.getChatInput().fill(text);
				await n8n.aiAssistant.getChatInput().press('Shift+Enter');
			};

			await sendMessage('What is wrong with this workflow?');
			await sendMessage('And now?');

			const secondRequest = chatRequests.find((request) => request.payload?.text === 'And now?');
			const secondContext = secondRequest?.payload?.context;
			expect(secondContext?.currentWorkflow).toBeUndefined();

			await n8n.canvas.openNode(HTTP_REQUEST_NODE_NAME);
			await n8n.ndv.setParameterInputValue('url', 'https://example.com');
			await n8n.ndv.close();
			await n8n.canvas.clickExecuteWorkflowButton();

			await sendMessage('What about now?');

			const thirdRequest = chatRequests.find(
				(request) => request.payload?.text === 'What about now?',
			);
			console.log(chatRequests);
			const thirdContext = thirdRequest?.payload?.context;
			expect(thirdContext?.currentWorkflow).toBeTruthy();
			expect(thirdContext?.executionData).toBeTruthy();
		});
	});

	test.describe('AI Assistant Credential Help', () => {
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

			await n8n.credentials.emptyListCreateCredentialButton.click();
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
