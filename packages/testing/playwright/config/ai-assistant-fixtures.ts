import type { TestRequirements } from '../Types';

// #region Mock AI Responses

export const simpleAssistantResponse = {
	sessionId: '1',
	messages: [
		{
			role: 'assistant',
			type: 'message',
			text: 'Hey, this is an assistant message',
		},
	],
};

export const codeDiffSuggestionResponse = {
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

export const applyCodeDiffResponse = {
	data: {
		sessionId:
			'f9130bd7-c078-4862-a38a-369b27b0ff20-e96eb9f7-d581-4684-b6a9-fd3dfe9fe1fb-emTezIGat7bQsDdtIlbti',
		parameters: {
			jsCode:
				"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\\nfor (export const item of $input.all()) {\\n  item.json.myNewField = 1;\\n}\\n\\nreturn $input.all();",
		},
	},
};

export const nodeExecutionSucceededResponse = {
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

export const codeSnippetAssistantResponse = {
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

export const aiDisabledRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: false, setup: false },
		},
		features: { aiAssistant: false },
	},
};

export const aiEnabledRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
		},
		features: { aiAssistant: true, setup: true },
	},
};

export const aiEnabledWithWorkflowRequirements: TestRequirements = {
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

export const aiEnabledWithQuickRepliesRequirements: TestRequirements = {
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

export const aiEnabledWithEndSessionRequirements: TestRequirements = {
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

export const aiEnabledWorkflowBaseRequirements: TestRequirements = {
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

export const aiEnabledWithCodeDiffRequirements: TestRequirements = {
	...aiEnabledWorkflowBaseRequirements,
	intercepts: {
		aiChat: {
			url: '**/rest/ai/chat',
			response: codeDiffSuggestionResponse,
		},
	},
};

export const aiEnabledWithSimpleChatRequirements: TestRequirements = {
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

export const aiEnabledWithCodeSnippetRequirements: TestRequirements = {
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

export const aiEnabledWithHttpWorkflowRequirements: TestRequirements = {
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
