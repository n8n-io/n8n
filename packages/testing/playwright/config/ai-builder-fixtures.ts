import type { TestRequirements } from '../Types';

// #region Mock Workflow Builder Responses

/**
 * Mock response for workflow builder that includes workflow generation
 * This simulates the builder creating a simple 2-node workflow
 */
export const workflowBuilderGenerationResponse = {
	sessionId: 'test-builder-session-123',
	messages: [
		{
			role: 'assistant',
			type: 'tool',
			toolName: 'create_workflow',
			displayTitle: 'Creating workflow',
			status: 'success',
			toolCallId: 'call-1',
		},
		{
			role: 'assistant',
			type: 'tool',
			toolName: 'add_node',
			displayTitle: 'Adding Manual Trigger node',
			status: 'success',
			toolCallId: 'call-2',
		},
		{
			role: 'assistant',
			type: 'tool',
			toolName: 'add_node',
			displayTitle: 'Adding HTTP Request node',
			status: 'success',
			toolCallId: 'call-3',
		},
		{
			role: 'assistant',
			type: 'workflow-updated',
			id: 'workflow-update-1',
			codeSnippet: JSON.stringify({
				name: 'AI Generated Workflow',
				nodes: [
					{
						parameters: {},
						id: 'manual-trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
					},
					{
						parameters: {
							url: 'https://jsonplaceholder.typicode.com/posts/1',
							method: 'GET',
						},
						id: 'http-request-1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [450, 300],
					},
				],
				connections: {
					'Manual Trigger': {
						main: [
							[
								{
									node: 'HTTP Request',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
				pinData: {},
			}),
		},
		{
			role: 'assistant',
			type: 'message',
			text: "I've created a workflow with a Manual Trigger and an HTTP Request node. The HTTP Request will fetch data from a sample API.",
		},
	],
};

/**
 * Mock response for a more complex workflow with multiple nodes
 */
export const complexWorkflowBuilderResponse = {
	sessionId: 'test-builder-session-456',
	messages: [
		{
			role: 'assistant',
			type: 'tool',
			toolName: 'create_workflow',
			displayTitle: 'Creating workflow',
			status: 'success',
			toolCallId: 'call-1',
		},
		{
			role: 'assistant',
			type: 'workflow-updated',
			id: 'workflow-update-2',
			codeSnippet: JSON.stringify({
				name: 'Complex AI Workflow',
				nodes: [
					{
						parameters: {},
						id: 'manual-trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
					},
					{
						parameters: {
							url: 'https://api.example.com/data',
							method: 'GET',
						},
						id: 'http-request-1',
						name: 'Fetch Data',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [450, 300],
					},
					{
						parameters: {
							jsCode: 'return items.map(item => ({ ...item.json, processed: true }));',
						},
						id: 'code-1',
						name: 'Process Data',
						type: 'n8n-nodes-base.code',
						typeVersion: 2,
						position: [650, 300],
					},
				],
				connections: {
					'Manual Trigger': {
						main: [
							[
								{
									node: 'Fetch Data',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					'Fetch Data': {
						main: [
							[
								{
									node: 'Process Data',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
				pinData: {},
			}),
		},
		{
			role: 'assistant',
			type: 'message',
			text: "I've created a workflow that fetches data from an API and processes it with a Code node.",
		},
	],
};

/**
 * Mock response for workflow builder error scenario
 */
export const workflowBuilderErrorResponse = {
	sessionId: 'test-builder-session-error',
	messages: [
		{
			role: 'assistant',
			type: 'error',
			text: 'I encountered an error while building the workflow. Please try again.',
		},
	],
};

// #endregion

// #region Test Requirements for Workflow Builder

/**
 * Base requirements for enabling the workflow builder feature
 */
export const workflowBuilderEnabledRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
			aiBuilder: { enabled: true, setup: true },
		},
		features: {
			aiAssistant: true,
			aiBuilder: true,
		},
	},
};

/**
 * Requirements with mocked workflow generation response
 */
export const workflowBuilderWithSimpleWorkflowRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
			aiBuilder: { enabled: true, setup: true },
		},
		features: {
			aiAssistant: true,
			aiBuilder: true,
		},
	},
	intercepts: {
		builderChat: {
			url: '**/rest/ai/build',
			response: workflowBuilderGenerationResponse,
		},
	},
};

/**
 * Requirements with mocked complex workflow generation
 */
export const workflowBuilderWithComplexWorkflowRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
			aiBuilder: { enabled: true, setup: true },
		},
		features: {
			aiAssistant: true,
			aiBuilder: true,
		},
	},
	intercepts: {
		builderChat: {
			url: '**/rest/ai/build',
			response: complexWorkflowBuilderResponse,
		},
	},
};

/**
 * Requirements for testing error scenarios
 */
export const workflowBuilderWithErrorRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true },
			aiBuilder: { enabled: true, setup: true },
		},
		features: {
			aiAssistant: true,
			aiBuilder: true,
		},
	},
	intercepts: {
		builderChat: {
			url: '**/rest/ai/build',
			response: workflowBuilderErrorResponse,
		},
	},
};

// #endregion
