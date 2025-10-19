import { v5 as uuidv5, v3 as uuidv3, v4 as uuidv4, v1 as uuidv1 } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { nodeTypes } from './ExpressionExtensions/helpers';
import type { NodeTypes } from './node-types';
import { STICKY_NODE_TYPE } from '../src/constants';
import { ApplicationError, ExpressionError, NodeApiError } from '../src/errors';
import type {
	INode,
	INodeTypeDescription,
	IRun,
	IRunData,
	NodeConnectionType,
	IWorkflowBase,
	INodeParameters,
} from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';
import * as nodeHelpers from '../src/node-helpers';
import {
	ANONYMIZATION_CHARACTER as CHAR,
	extractLastExecutedNodeCredentialData,
	extractLastExecutedNodeStructuredOutputErrorInfo,
	generateNodesGraph,
	getDomainBase,
	getDomainPath,
	resolveAIMetrics,
	resolveVectorStoreMetrics,
	userInInstanceRanOutOfFreeAiCredits,
} from '../src/telemetry-helpers';
import { randomInt } from '../src/utils';
import { DEFAULT_EVALUATION_METRIC } from '../src/evaluation-helpers';

describe('getDomainBase should return protocol plus domain', () => {
	test('in valid URLs', () => {
		for (const url of validUrls(numericId)) {
			const { full, protocolPlusDomain } = url;
			expect(getDomainBase(full)).toBe(protocolPlusDomain);
		}
	});

	test('in malformed URLs', () => {
		for (const url of malformedUrls(numericId)) {
			const { full, protocolPlusDomain } = url;
			expect(getDomainBase(full)).toBe(protocolPlusDomain);
		}
	});
});

describe('getDomainPath should return pathname, excluding query string', () => {
	describe('anonymizing strings containing at least one number', () => {
		test('in valid URLs', () => {
			for (const url of validUrls(alphanumericId)) {
				const { full, pathname } = url;
				expect(getDomainPath(full)).toBe(pathname);
			}
		});

		test('in malformed URLs', () => {
			for (const url of malformedUrls(alphanumericId)) {
				const { full, pathname } = url;
				expect(getDomainPath(full)).toBe(pathname);
			}
		});
	});

	describe('anonymizing UUIDs', () => {
		test('in valid URLs', () => {
			for (const url of uuidUrls(validUrls)) {
				const { full, pathname } = url;
				expect(getDomainPath(full)).toBe(pathname);
			}
		});

		test('in malformed URLs', () => {
			for (const url of uuidUrls(malformedUrls)) {
				const { full, pathname } = url;
				expect(getDomainPath(full)).toBe(pathname);
			}
		});
	});

	describe('anonymizing emails', () => {
		test('in valid URLs', () => {
			for (const url of validUrls(email)) {
				const { full, pathname } = url;
				expect(getDomainPath(full)).toBe(pathname);
			}
		});

		test('in malformed URLs', () => {
			for (const url of malformedUrls(email)) {
				const { full, pathname } = url;
				expect(getDomainPath(full)).toBe(pathname);
			}
		});
	});
});

describe('generateNodesGraph', () => {
	test('should return node graph when node type is unknown', () => {
		const workflow: IWorkflowBase = {
			createdAt: new Date('2024-01-05T13:49:14.244Z'),
			updatedAt: new Date('2024-01-05T15:44:31.000Z'),
			id: 'NfV4GV9aQTifSLc2',
			name: 'My workflow 26',
			active: false,
			isArchived: false,
			nodes: [
				{
					parameters: {},
					id: 'fa7d5628-5a47-4c8f-98ef-fb3532e5a9f5',
					name: 'When clicking "Execute Workflow"',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [420, 420],
				},
				{
					parameters: {
						documentId: { __rl: true, mode: 'list', value: '' },
						sheetName: { __rl: true, mode: 'list', value: '' },
					},
					id: '266128b9-e5db-4c26-9555-185d48946afb',
					name: 'Google Sheets',
					type: 'test.unknown',
					typeVersion: 4.2,
					position: [640, 420],
				},
			],
			connections: {
				'When clicking "Execute Workflow"': {
					main: [[{ node: 'Google Sheets', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
			settings: { executionOrder: 'v1' },
			pinData: {},
			versionId: '70b92d94-0e9a-4b41-9976-a654df420af5',
		};
		expect(generateNodesGraph(workflow, nodeTypes)).toEqual({
			nodeGraph: {
				node_types: ['n8n-nodes-base.manualTrigger', 'test.unknown'],
				node_connections: [{ start: '0', end: '1' }],
				nodes: {
					'0': {
						id: 'fa7d5628-5a47-4c8f-98ef-fb3532e5a9f5',
						type: 'n8n-nodes-base.manualTrigger',
						version: 1,
						position: [420, 420],
					},
					'1': {
						id: '266128b9-e5db-4c26-9555-185d48946afb',
						type: 'test.unknown',
						version: 4.2,
						position: [640, 420],
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'When clicking "Execute Workflow"': '0', 'Google Sheets': '1' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return node graph when workflow is empty', () => {
		const workflow: IWorkflowBase = {
			createdAt: new Date('2024-01-05T13:49:14.244Z'),
			updatedAt: new Date('2024-01-05T15:44:31.000Z'),
			id: 'NfV4GV9aQTifSLc2',
			name: 'My workflow 26',
			active: false,
			isArchived: false,
			nodes: [],
			connections: {},
			settings: { executionOrder: 'v1' },
			pinData: {},
			versionId: '70b92d94-0e9a-4b41-9976-a654df420af5',
		};
		expect(generateNodesGraph(workflow, nodeTypes)).toEqual({
			nodeGraph: {
				node_types: [],
				node_connections: [],
				nodes: {},
				notes: {},
				is_pinned: false,
			},
			nameIndices: {},
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return node graph when workflow keys are not set', () => {
		const workflow: Partial<IWorkflowBase> = {};
		expect(generateNodesGraph(workflow, nodeTypes)).toEqual({
			nodeGraph: {
				node_types: [],
				node_connections: [],
				nodes: {},
				notes: {},
				is_pinned: false,
			},
			nameIndices: {},
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return node graph when node has multiple operation fields with different display options', () => {
		const workflow: IWorkflowBase = {
			createdAt: new Date('2024-01-05T13:49:14.244Z'),
			updatedAt: new Date('2024-01-05T15:44:31.000Z'),
			id: 'NfV4GV9aQTifSLc2',
			name: 'My workflow 26',
			active: false,
			isArchived: false,
			nodes: [
				{
					parameters: {},
					id: 'fa7d5628-5a47-4c8f-98ef-fb3532e5a9f5',
					name: 'When clicking "Execute Workflow"',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [420, 420],
				},
				{
					parameters: {
						documentId: { __rl: true, mode: 'list', value: '' },
						sheetName: { __rl: true, mode: 'list', value: '' },
					},
					id: '266128b9-e5db-4c26-9555-185d48946afb',
					name: 'Google Sheets',
					type: 'test.googleSheets',
					typeVersion: 4.2,
					position: [640, 420],
				},
			],
			connections: {
				'When clicking "Execute Workflow"': {
					main: [[{ node: 'Google Sheets', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
			settings: { executionOrder: 'v1' },
			pinData: {},
			versionId: '70b92d94-0e9a-4b41-9976-a654df420af5',
		};
		expect(generateNodesGraph(workflow, nodeTypes)).toEqual({
			nodeGraph: {
				node_types: ['n8n-nodes-base.manualTrigger', 'test.googleSheets'],
				node_connections: [{ start: '0', end: '1' }],
				nodes: {
					'0': {
						id: 'fa7d5628-5a47-4c8f-98ef-fb3532e5a9f5',
						type: 'n8n-nodes-base.manualTrigger',
						version: 1,
						position: [420, 420],
					},
					'1': {
						id: '266128b9-e5db-4c26-9555-185d48946afb',
						type: 'test.googleSheets',
						version: 4.2,
						position: [640, 420],
						operation: 'read',
						resource: 'sheet',
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'When clicking "Execute Workflow"': '0', 'Google Sheets': '1' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return node graph with stickies of default size', () => {
		const workflow: IWorkflowBase = {
			createdAt: new Date('2024-01-05T13:49:14.244Z'),
			updatedAt: new Date('2024-01-05T15:44:31.000Z'),
			id: 'NfV4GV9aQTifSLc2',
			name: 'My workflow 26',
			active: false,
			isArchived: false,
			nodes: [
				{
					parameters: {},
					id: 'fa7d5628-5a47-4c8f-98ef-fb3532e5a9f5',
					name: 'When clicking "Execute Workflow"',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [420, 420],
				},
				{
					parameters: {
						documentId: { __rl: true, mode: 'list', value: '' },
						sheetName: { __rl: true, mode: 'list', value: '' },
					},
					id: '266128b9-e5db-4c26-9555-185d48946afb',
					name: 'Google Sheets',
					type: 'test.googleSheets',
					typeVersion: 4.2,
					position: [640, 420],
				},
				{
					parameters: {
						content:
							"test\n\n## I'm a note \n**Double click** to edit me. [Guide](https://docs.n8n.io/workflows/sticky-notes/)",
					},
					id: '03e85c3e-4303-4f93-8d62-e05d457e8f70',
					name: 'Sticky Note',
					type: 'n8n-nodes-base.stickyNote',
					typeVersion: 1,
					position: [240, 140],
				},
			],
			connections: {
				'When clicking "Execute Workflow"': {
					main: [[{ node: 'Google Sheets', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
			settings: { executionOrder: 'v1' },
			pinData: {},
			versionId: '70b92d94-0e9a-4b41-9976-a654df420af5',
		};
		expect(generateNodesGraph(workflow, nodeTypes)).toEqual({
			nodeGraph: {
				node_types: ['n8n-nodes-base.manualTrigger', 'test.googleSheets'],
				node_connections: [{ start: '0', end: '1' }],
				nodes: {
					'0': {
						id: 'fa7d5628-5a47-4c8f-98ef-fb3532e5a9f5',
						type: 'n8n-nodes-base.manualTrigger',
						version: 1,
						position: [420, 420],
					},
					'1': {
						id: '266128b9-e5db-4c26-9555-185d48946afb',
						type: 'test.googleSheets',
						version: 4.2,
						position: [640, 420],
						operation: 'read',
						resource: 'sheet',
					},
				},
				notes: { '0': { overlapping: false, position: [240, 140], height: 160, width: 240 } },
				is_pinned: false,
			},
			nameIndices: { 'When clicking "Execute Workflow"': '0', 'Google Sheets': '1' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return node graph with agent node and all prompt types when cloud telemetry is enabled', () => {
		const optionalPrompts = {
			humanMessage: 'Human message',
			systemMessage: 'System message',
			humanMessageTemplate: 'Human template',
			prefix: 'Prefix',
			suffixChat: 'Suffix Chat',
			suffix: 'Suffix',
			prefixPrompt: 'Prefix Prompt',
			suffixPrompt: 'Suffix Prompt',
		};

		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						agent: 'toolsAgent',
						text: 'Agent prompt text',
						options: {
							...optionalPrompts,
						},
					},
					id: 'agent-node-id',
					name: 'Agent Node',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					position: [100, 100],
				},
				{
					parameters: {},
					id: 'other-node-id',
					name: 'Other Node',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [200, 200],
				},
			],
			connections: {
				'Agent Node': {
					main: [[{ node: 'Other Node', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
			pinData: {},
		};

		expect(generateNodesGraph(workflow, nodeTypes, { isCloudDeployment: true })).toEqual({
			nodeGraph: {
				node_types: ['@n8n/n8n-nodes-langchain.agent', 'n8n-nodes-base.set'],
				node_connections: [{ start: '0', end: '1' }],
				nodes: {
					'0': {
						id: 'agent-node-id',
						type: '@n8n/n8n-nodes-langchain.agent',
						version: 1,
						position: [100, 100],
						agent: 'toolsAgent',
						prompts: { text: 'Agent prompt text', ...optionalPrompts },
					},
					'1': {
						id: 'other-node-id',
						type: 'n8n-nodes-base.set',
						version: 1,
						position: [200, 200],
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'Agent Node': '0', 'Other Node': '1' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return node graph with agent node without prompt types when cloud telemetry is disbaled', () => {
		const optionalPrompts = {
			humanMessage: 'Human message',
			systemMessage: 'System message',
			humanMessageTemplate: 'Human template',
			prefix: 'Prefix',
			suffixChat: 'Suffix Chat',
			suffix: 'Suffix',
			prefixPrompt: 'Prefix Prompt',
			suffixPrompt: 'Suffix Prompt',
		};

		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						agent: 'toolsAgent',
						text: 'Agent prompt text',
						options: {
							...optionalPrompts,
						},
					},
					id: 'agent-node-id',
					name: 'Agent Node',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					position: [100, 100],
				},
				{
					parameters: {},
					id: 'other-node-id',
					name: 'Other Node',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [200, 200],
				},
			],
			connections: {
				'Agent Node': {
					main: [[{ node: 'Other Node', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
			pinData: {},
		};

		expect(generateNodesGraph(workflow, nodeTypes, { isCloudDeployment: false })).toEqual({
			nodeGraph: {
				node_types: ['@n8n/n8n-nodes-langchain.agent', 'n8n-nodes-base.set'],
				node_connections: [{ start: '0', end: '1' }],
				nodes: {
					'0': {
						id: 'agent-node-id',
						type: '@n8n/n8n-nodes-langchain.agent',
						version: 1,
						position: [100, 100],
						agent: 'toolsAgent',
					},
					'1': {
						id: 'other-node-id',
						type: 'n8n-nodes-base.set',
						version: 1,
						position: [200, 200],
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'Agent Node': '0', 'Other Node': '1' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return node graph with agent tool node and prompt text when cloud telemetry is enabled', () => {
		const optionalPrompts = {
			humanMessage: 'Human message',
			systemMessage: 'System message',
			humanMessageTemplate: 'Human template',
			prefix: 'Prefix',
			suffixChat: 'Suffix Chat',
			suffix: 'Suffix',
			prefixPrompt: 'Prefix Prompt',
			suffixPrompt: 'Suffix Prompt',
		};

		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						text: 'Tool agent prompt',
						options: {
							...optionalPrompts,
						},
					},
					id: 'agent-tool-node-id',
					name: 'Agent Tool Node',
					type: '@n8n/n8n-nodes-langchain.agentTool',
					typeVersion: 1,
					position: [300, 300],
				},
			],
			connections: {},
			pinData: {},
		};

		expect(generateNodesGraph(workflow, nodeTypes, { isCloudDeployment: true })).toEqual({
			nodeGraph: {
				node_types: ['@n8n/n8n-nodes-langchain.agentTool'],
				node_connections: [],
				nodes: {
					'0': {
						id: 'agent-tool-node-id',
						type: '@n8n/n8n-nodes-langchain.agentTool',
						version: 1,
						position: [300, 300],
						prompts: { text: 'Tool agent prompt', ...optionalPrompts },
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'Agent Tool Node': '0' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return node graph with openai langchain node and prompts array when cloud telemetry is enabled', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						messages: {
							values: [
								{ role: 'system', content: 'You are a helpful assistant.' },
								{ role: 'user', content: 'Hello!' },
							],
						},
					},
					id: 'openai-node-id',
					name: 'OpenAI Node',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1,
					position: [400, 400],
				},
			],
			connections: {},
			pinData: {},
		};

		expect(generateNodesGraph(workflow, nodeTypes, { isCloudDeployment: true })).toEqual({
			nodeGraph: {
				node_types: ['@n8n/n8n-nodes-langchain.lmChatOpenAi'],
				node_connections: [],
				nodes: {
					'0': {
						id: 'openai-node-id',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1,
						position: [400, 400],
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'OpenAI Node': '0' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return node graph with chain summarization node and summarization prompts when cloud telemetry is enabled', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						options: {
							summarizationMethodAndPrompts: {
								values: { summaryPrompt: 'Summarize this text.' },
							},
						},
					},
					id: 'summarization-node-id',
					name: 'Summarization Node',
					type: '@n8n/n8n-nodes-langchain.chainSummarization',
					typeVersion: 1,
					position: [500, 500],
				},
			],
			connections: {},
			pinData: {},
		};

		expect(generateNodesGraph(workflow, nodeTypes, { isCloudDeployment: true })).toEqual({
			nodeGraph: {
				node_types: ['@n8n/n8n-nodes-langchain.chainSummarization'],
				node_connections: [],
				nodes: {
					'0': {
						id: 'summarization-node-id',
						type: '@n8n/n8n-nodes-langchain.chainSummarization',
						version: 1,
						position: [500, 500],
						prompts: { summaryPrompt: 'Summarize this text.' },
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'Summarization Node': '0' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return node graph with langchain custom tool node and description prompt when cloud telemetry is enabled', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						description: 'Custom tool description',
					},
					id: 'custom-tool-node-id',
					name: 'Custom Tool Node',
					type: '@n8n/n8n-nodes-langchain.customTool',
					typeVersion: 1,
					position: [600, 600],
				},
			],
			connections: {},
			pinData: {},
		};

		expect(generateNodesGraph(workflow, nodeTypes, { isCloudDeployment: true })).toEqual({
			nodeGraph: {
				node_types: ['@n8n/n8n-nodes-langchain.customTool'],
				node_connections: [],
				nodes: {
					'0': {
						id: 'custom-tool-node-id',
						type: '@n8n/n8n-nodes-langchain.customTool',
						version: 1,
						position: [600, 600],
						// prompts: { description: 'Custom tool description' },
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'Custom Tool Node': '0' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return node graph with chain llm node and messageValues prompts when cloud telemetry is enabled', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						messages: {
							messageValues: [
								{ role: 'system', content: 'Chain LLM system prompt.' },
								{ role: 'user', content: 'Chain LLM user prompt.' },
							],
						},
					},
					id: 'chain-llm-node-id',
					name: 'Chain LLM Node',
					type: '@n8n/n8n-nodes-langchain.chainLlm',
					typeVersion: 1,
					position: [700, 700],
				},
			],
			connections: {},
			pinData: {},
		};

		expect(generateNodesGraph(workflow, nodeTypes, { isCloudDeployment: true })).toEqual({
			nodeGraph: {
				node_types: ['@n8n/n8n-nodes-langchain.chainLlm'],
				node_connections: [],
				nodes: {
					'0': {
						id: 'chain-llm-node-id',
						type: '@n8n/n8n-nodes-langchain.chainLlm',
						version: 1,
						position: [700, 700],
						prompts: [
							{ role: 'system', content: 'Chain LLM system prompt.' },
							{ role: 'user', content: 'Chain LLM user prompt.' },
						],
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'Chain LLM Node': '0' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return node graph with stickies indicating overlap', () => {
		const workflow: IWorkflowBase = {
			createdAt: new Date('2024-01-05T13:49:14.244Z'),
			updatedAt: new Date('2024-01-05T15:44:31.000Z'),
			id: 'NfV4GV9aQTifSLc2',
			name: 'My workflow 26',
			active: false,
			isArchived: false,
			nodes: [
				{
					parameters: {},
					id: 'fa7d5628-5a47-4c8f-98ef-fb3532e5a9f5',
					name: 'When clicking "Execute Workflow"',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [420, 420],
				},
				{
					parameters: {
						documentId: { __rl: true, mode: 'list', value: '' },
						sheetName: { __rl: true, mode: 'list', value: '' },
					},
					id: '266128b9-e5db-4c26-9555-185d48946afb',
					name: 'Google Sheets',
					type: 'test.googleSheets',
					typeVersion: 4.2,
					position: [640, 420],
				},
				{
					parameters: {
						content:
							"test\n\n## I'm a note \n**Double click** to edit me. [Guide](https://docs.n8n.io/workflows/sticky-notes/)",
						height: 488,
						width: 645,
					},
					id: '03e85c3e-4303-4f93-8d62-e05d457e8f70',
					name: 'Sticky Note',
					type: 'n8n-nodes-base.stickyNote',
					typeVersion: 1,
					position: [240, 140],
				},
			],
			connections: {
				'When clicking "Execute Workflow"': {
					main: [[{ node: 'Google Sheets', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
			settings: { executionOrder: 'v1' },
			pinData: {},
			versionId: '70b92d94-0e9a-4b41-9976-a654df420af5',
		};
		expect(generateNodesGraph(workflow, nodeTypes)).toEqual({
			evaluationTriggerNodeNames: [],
			nodeGraph: {
				node_types: ['n8n-nodes-base.manualTrigger', 'test.googleSheets'],
				node_connections: [{ start: '0', end: '1' }],
				nodes: {
					'0': {
						id: 'fa7d5628-5a47-4c8f-98ef-fb3532e5a9f5',
						type: 'n8n-nodes-base.manualTrigger',
						version: 1,
						position: [420, 420],
					},
					'1': {
						id: '266128b9-e5db-4c26-9555-185d48946afb',
						type: 'test.googleSheets',
						version: 4.2,
						position: [640, 420],
						operation: 'read',
						resource: 'sheet',
					},
				},
				notes: { '0': { overlapping: true, position: [240, 140], height: 488, width: 645 } },
				is_pinned: false,
			},
			nameIndices: { 'When clicking "Execute Workflow"': '0', 'Google Sheets': '1' },
			webhookNodeNames: [],
		});
	});

	test('should return node graph indicating pinned data', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {},
					id: 'e59d3ad9-3448-4899-9f47-d2922c8727ce',
					name: 'When clicking "Execute Workflow"',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [460, 460],
				},
			],
			connections: {},
			pinData: {
				'When clicking "Execute Workflow"': [],
			},
		};
		expect(generateNodesGraph(workflow, nodeTypes)).toEqual({
			nameIndices: {
				'When clicking "Execute Workflow"': '0',
			},
			nodeGraph: {
				is_pinned: true,
				node_connections: [],
				node_types: ['n8n-nodes-base.manualTrigger'],
				nodes: {
					'0': {
						id: 'e59d3ad9-3448-4899-9f47-d2922c8727ce',
						position: [460, 460],
						type: 'n8n-nodes-base.manualTrigger',
						version: 1,
					},
				},
				notes: {},
			},
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return graph with webhook node', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						path: 'bf4c0699-cff8-4440-8964-8e97fda8b4f8',
						options: {},
					},
					id: '5e49e129-2c59-4650-95ea-14d4b94db1f3',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1.1,
					position: [520, 380],
					webhookId: 'bf4c0699-cff8-4440-8964-8e97fda8b4f8',
				},
			],
			connections: {},
			pinData: {},
		};
		expect(generateNodesGraph(workflow, nodeTypes)).toEqual({
			evaluationTriggerNodeNames: [],
			nodeGraph: {
				node_types: ['n8n-nodes-base.webhook'],
				node_connections: [],
				nodes: {
					'0': {
						id: '5e49e129-2c59-4650-95ea-14d4b94db1f3',
						type: 'n8n-nodes-base.webhook',
						version: 1.1,
						position: [520, 380],
						response_mode: 'onReceived',
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { Webhook: '0' },
			webhookNodeNames: ['Webhook'],
		});
	});

	test('should return graph with http v4 node with generic auth', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						url: 'google.com/path/test',
						authentication: 'genericCredentialType',
						genericAuthType: 'httpBasicAuth',
						options: {},
					},
					id: '04d6e44f-09c1-454d-9225-60aeed7f022c',
					name: 'HTTP Request V4 with generic auth',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.1,
					position: [780, 120],
					credentials: {
						httpBasicAuth: {
							id: 'yuuJAO2Ang5B64wd',
							name: 'Unnamed credential',
						},
					},
				},
			],
			connections: {},
			pinData: {},
		};
		expect(generateNodesGraph(workflow, nodeTypes)).toEqual({
			evaluationTriggerNodeNames: [],
			nodeGraph: {
				node_types: ['n8n-nodes-base.httpRequest'],
				node_connections: [],
				nodes: {
					'0': {
						id: '04d6e44f-09c1-454d-9225-60aeed7f022c',
						type: 'n8n-nodes-base.httpRequest',
						version: 4.1,
						position: [780, 120],
						credential_type: 'httpBasicAuth',
						credential_set: true,
						domain_base: 'google.com',
						domain_path: '/path/test',
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'HTTP Request V4 with generic auth': '0' },
			webhookNodeNames: [],
		});
	});

	test('should return graph with HTTP V4 with predefined cred', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						url: 'google.com/path/test',
						authentication: 'predefinedCredentialType',
						nodeCredentialType: 'activeCampaignApi',
						options: {},
					},
					id: 'dcc4a9e1-c2c5-4d7e-aec0-2a23adabbb77',
					name: 'HTTP Request V4 with predefined cred',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.1,
					position: [320, 220],
					credentials: {
						httpBasicAuth: {
							id: 'yuuJAO2Ang5B64wd',
							name: 'Unnamed credential',
						},
						activeCampaignApi: {
							id: 'SFCbnfgRBuSzRu6N',
							name: 'ActiveCampaign account',
						},
					},
				},
			],
			connections: {},
			pinData: {},
		};
		expect(generateNodesGraph(workflow, nodeTypes)).toEqual({
			evaluationTriggerNodeNames: [],
			nodeGraph: {
				node_types: ['n8n-nodes-base.httpRequest'],
				node_connections: [],
				nodes: {
					'0': {
						id: 'dcc4a9e1-c2c5-4d7e-aec0-2a23adabbb77',
						type: 'n8n-nodes-base.httpRequest',
						version: 4.1,
						position: [320, 220],
						credential_type: 'activeCampaignApi',
						credential_set: true,
						domain_base: 'google.com',
						domain_path: '/path/test',
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'HTTP Request V4 with predefined cred': '0' },
			webhookNodeNames: [],
		});
	});

	it.each([
		{
			workflow: {
				nodes: [
					{
						parameters: {
							mode: 'combineBySql',
							query: 'SELECT * FROM input1 LEFT JOIN input2 ON input1.name = input2.id',
						},
						id: 'b468b603-3e59-4515-b555-90cfebd64d47',
						name: 'Merge Node V3',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3,
						position: [320, 460],
					},
				],
				connections: {},
				pinData: {},
			} as Partial<IWorkflowBase>,
			isCloudDeployment: false,
			expected: {
				nodeGraph: {
					node_types: ['n8n-nodes-base.merge'],
					node_connections: [],
					nodes: {
						'0': {
							id: 'b468b603-3e59-4515-b555-90cfebd64d47',
							type: 'n8n-nodes-base.merge',
							version: 3,
							position: [320, 460],
							operation: 'combineBySql',
						},
					},
					notes: {},
					is_pinned: false,
				},
				nameIndices: { 'Merge Node V3': '0' },
				webhookNodeNames: [],
				evaluationTriggerNodeNames: [],
			},
		},
		{
			workflow: {
				nodes: [
					{
						parameters: {
							mode: 'append',
						},
						id: 'b468b603-3e59-4515-b555-90cfebd64d47',
						name: 'Merge Node V3',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3,
						position: [320, 460],
					},
				],
				connections: {},
				pinData: {},
			} as Partial<IWorkflowBase>,
			isCloudDeployment: true,
			expected: {
				nodeGraph: {
					node_types: ['n8n-nodes-base.merge'],
					node_connections: [],
					nodes: {
						'0': {
							id: 'b468b603-3e59-4515-b555-90cfebd64d47',
							type: 'n8n-nodes-base.merge',
							version: 3,
							position: [320, 460],
							operation: 'append',
						},
					},
					notes: {},
					is_pinned: false,
				},
				nameIndices: { 'Merge Node V3': '0' },
				webhookNodeNames: [],
				evaluationTriggerNodeNames: [],
			},
		},
		{
			workflow: {
				nodes: [
					{
						parameters: {
							mode: 'combineBySql',
							query: 'SELECT * FROM input1 LEFT JOIN input2 ON input1.name = input2.id',
						},
						id: 'b468b603-3e59-4515-b555-90cfebd64d47',
						name: 'Merge Node V3',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3,
						position: [320, 460],
					},
				],
				connections: {},
				pinData: {},
			} as Partial<IWorkflowBase>,
			isCloudDeployment: true,
			expected: {
				nodeGraph: {
					node_types: ['n8n-nodes-base.merge'],
					node_connections: [],
					nodes: {
						'0': {
							id: 'b468b603-3e59-4515-b555-90cfebd64d47',
							type: 'n8n-nodes-base.merge',
							version: 3,
							position: [320, 460],
							operation: 'combineBySql',
							sql: 'SELECT * FROM input1 LEFT JOIN input2 ON input1.name = input2.id',
						},
					},
					notes: {},
					is_pinned: false,
				},
				nameIndices: { 'Merge Node V3': '0' },
				webhookNodeNames: [],
				evaluationTriggerNodeNames: [],
			},
		},
	])('should return graph with merge v3 node', ({ workflow, expected, isCloudDeployment }) => {
		expect(generateNodesGraph(workflow, nodeTypes, { isCloudDeployment })).toEqual(expected);
	});

	test('should return graph with http v1 node', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						url: 'https://google.com',
						options: {},
					},
					id: 'b468b603-3e59-4515-b555-90cfebd64d47',
					name: 'HTTP Request V1',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [320, 460],
				},
			],
			connections: {},
			pinData: {},
		};
		expect(generateNodesGraph(workflow, nodeTypes)).toEqual({
			nodeGraph: {
				node_types: ['n8n-nodes-base.httpRequest'],
				node_connections: [],
				nodes: {
					'0': {
						id: 'b468b603-3e59-4515-b555-90cfebd64d47',
						type: 'n8n-nodes-base.httpRequest',
						version: 1,
						position: [320, 460],
						domain: 'google.com',
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'HTTP Request V1': '0' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should return graph with http v4 node with no parameters and no credentials', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						options: {},
					},
					id: 'd002e66f-deba-455c-9f8b-65239db453c3',
					name: 'HTTP Request v4 with defaults',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.1,
					position: [600, 240],
				},
			],
			connections: {},
			pinData: {},
		};
		expect(generateNodesGraph(workflow, nodeTypes)).toEqual({
			nodeGraph: {
				node_types: ['n8n-nodes-base.httpRequest'],
				node_connections: [],
				nodes: {
					'0': {
						id: 'd002e66f-deba-455c-9f8b-65239db453c3',
						type: 'n8n-nodes-base.httpRequest',
						version: 4.1,
						position: [600, 240],
						credential_set: false,
						domain_base: '',
						domain_path: '',
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'HTTP Request v4 with defaults': '0' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should support custom connections like in AI nodes', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {},
					id: 'fe69383c-e418-4f98-9c0e-924deafa7f93',
					name: 'When clicking ‘Execute workflow’',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [540, 220],
				},
				{
					parameters: {},
					id: 'c5c374f1-6fad-46bb-8eea-ceec126b300a',
					name: 'Chain',
					type: '@n8n/n8n-nodes-langchain.chainLlm',
					typeVersion: 1,
					position: [760, 320],
				},
				{
					parameters: {
						options: {},
					},
					id: '198133b6-95dd-4f7e-90e5-e16c4cdbad12',
					name: 'Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1,
					position: [780, 500],
				},
			],
			connections: {
				'When clicking ‘Execute workflow’': {
					main: [
						[
							{
								node: 'Chain',
								type: NodeConnectionTypes.Main,
								index: 0,
							},
						],
					],
				},
				Model: {
					ai_languageModel: [
						[
							{
								node: 'Chain',
								type: NodeConnectionTypes.AiLanguageModel,
								index: 0,
							},
						],
					],
				},
			},
		};

		expect(generateNodesGraph(workflow, nodeTypes)).toEqual({
			nodeGraph: {
				node_types: [
					'n8n-nodes-base.manualTrigger',
					'@n8n/n8n-nodes-langchain.chainLlm',
					'@n8n/n8n-nodes-langchain.lmChatOpenAi',
				],
				node_connections: [
					{
						start: '0',
						end: '1',
					},
					{
						start: '2',
						end: '1',
					},
				],
				nodes: {
					'0': {
						id: 'fe69383c-e418-4f98-9c0e-924deafa7f93',
						type: 'n8n-nodes-base.manualTrigger',
						version: 1,
						position: [540, 220],
					},
					'1': {
						id: 'c5c374f1-6fad-46bb-8eea-ceec126b300a',
						type: '@n8n/n8n-nodes-langchain.chainLlm',
						version: 1,
						position: [760, 320],
					},
					'2': {
						id: '198133b6-95dd-4f7e-90e5-e16c4cdbad12',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1,
						position: [780, 500],
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: {
				'When clicking ‘Execute workflow’': '0',
				Chain: '1',
				Model: '2',
			},
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should not fail on error to resolve a node parameter for sticky node type', () => {
		const workflow = mock<IWorkflowBase>({ nodes: [{ type: STICKY_NODE_TYPE }] });

		vi.spyOn(nodeHelpers, 'getNodeParameters').mockImplementationOnce(() => {
			throw new ApplicationError('Could not find property option');
		});

		expect(() => generateNodesGraph(workflow, nodeTypes)).not.toThrow();
	});

	test('should add run and items count', () => {
		const { workflow, runData } = generateTestWorkflowAndRunData();

		expect(generateNodesGraph(workflow, nodeTypes, { runData })).toEqual({
			nameIndices: {
				DebugHelper: '4',
				'Edit Fields': '1',
				'Edit Fields1': '2',
				'Edit Fields2': '3',
				'Execute Workflow Trigger': '0',
				Switch: '5',
			},
			nodeGraph: {
				is_pinned: false,
				node_connections: [
					{
						end: '1',
						start: '0',
					},
					{
						end: '4',
						start: '0',
					},
					{
						end: '5',
						start: '1',
					},
					{
						end: '1',
						start: '4',
					},
					{
						end: '2',
						start: '5',
					},
					{
						end: '3',
						start: '5',
					},
				],
				node_types: [
					'n8n-nodes-base.executeWorkflowTrigger',
					'n8n-nodes-base.set',
					'n8n-nodes-base.set',
					'n8n-nodes-base.set',
					'n8n-nodes-base.debugHelper',
					'n8n-nodes-base.switch',
				],
				nodes: {
					'0': {
						id: 'a2372c14-87de-42de-9f9e-1c499aa2c279',
						items_total: 1,
						position: [1000, 240],
						runs: 1,
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						version: 1,
					},
					'1': {
						id: '0f7aa00e-248c-452c-8cd0-62cb55941633',
						items_total: 4,
						position: [1460, 640],
						runs: 2,
						type: 'n8n-nodes-base.set',
						version: 3.1,
					},
					'2': {
						id: '9165c185-9f1c-4ec1-87bf-76ca66dfae38',
						items_total: 4,
						position: [1860, 260],
						runs: 2,
						type: 'n8n-nodes-base.set',
						version: 3.4,
					},
					'3': {
						id: '7a915fd5-5987-4ff1-9509-06b24a0a4613',
						position: [1940, 680],
						type: 'n8n-nodes-base.set',
						version: 3.4,
					},
					'4': {
						id: '63050e7c-8ad5-4f44-8fdd-da555e40471b',
						items_total: 3,
						position: [1220, 240],
						runs: 1,
						type: 'n8n-nodes-base.debugHelper',
						version: 1,
					},
					'5': {
						id: 'fbf7525d-2d1d-4dcf-97a0-43b53d087ef3',
						items_total: 4,
						position: [1680, 640],
						runs: 2,
						type: 'n8n-nodes-base.switch',
						version: 3.2,
					},
				},
				notes: {},
			},
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should handle Evaluation node with undefined metrics - uses default predefined metric', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						operation: 'setMetrics',
						// metrics is undefined - should fall back to default metric
					},
					id: 'eval-node-id',
					name: 'Evaluation Node',
					type: 'n8n-nodes-base.evaluation',
					typeVersion: 1,
					position: [100, 100],
				},
			],
			connections: {},
			pinData: {},
		};

		expect(generateNodesGraph(workflow, nodeTypes, { isCloudDeployment: true })).toEqual({
			nodeGraph: {
				node_types: ['n8n-nodes-base.evaluation'],
				node_connections: [],
				nodes: {
					'0': {
						id: 'eval-node-id',
						type: 'n8n-nodes-base.evaluation',
						version: 1,
						position: [100, 100],
						metric_names: [DEFAULT_EVALUATION_METRIC], // Default metric
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'Evaluation Node': '0' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should handle Evaluation node with custom metric parameter', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						operation: 'setMetrics',
						metric: 'helpfulness',
						// metrics is undefined but metric parameter is set
					},
					id: 'eval-node-id',
					name: 'Evaluation Node',
					type: 'n8n-nodes-base.evaluation',
					typeVersion: 1,
					position: [100, 100],
				},
			],
			connections: {},
			pinData: {},
		};

		expect(generateNodesGraph(workflow, nodeTypes, { isCloudDeployment: true })).toEqual({
			nodeGraph: {
				node_types: ['n8n-nodes-base.evaluation'],
				node_connections: [],
				nodes: {
					'0': {
						id: 'eval-node-id',
						type: 'n8n-nodes-base.evaluation',
						version: 1,
						position: [100, 100],
						metric_names: ['helpfulness'], // Custom metric from parameter
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'Evaluation Node': '0' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should handle Evaluation node with valid metrics assignments', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						operation: 'setMetrics',
						metrics: {
							assignments: [
								{ name: 'accuracy', value: 0.95 },
								{ name: 'precision', value: 0.87 },
								{ name: 'recall', value: 0.92 },
							],
						},
					},
					id: 'eval-node-id',
					name: 'Evaluation Node',
					type: 'n8n-nodes-base.evaluation',
					typeVersion: 1,
					position: [100, 100],
				},
			],
			connections: {},
			pinData: {},
		};

		expect(generateNodesGraph(workflow, nodeTypes, { isCloudDeployment: true })).toEqual({
			nodeGraph: {
				node_types: ['n8n-nodes-base.evaluation'],
				node_connections: [],
				nodes: {
					'0': {
						id: 'eval-node-id',
						type: 'n8n-nodes-base.evaluation',
						version: 1,
						position: [100, 100],
						metric_names: ['accuracy', 'precision', 'recall'],
					},
				},
				notes: {},
				is_pinned: false,
			},
			nameIndices: { 'Evaluation Node': '0' },
			webhookNodeNames: [],
			evaluationTriggerNodeNames: [],
		});
	});

	test('should add package version to node graph', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {},
					id: 'fe69383c-e418-4f98-9c0e-924deafa7f93',
					name: 'When clicking ‘Execute workflow’',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [100, 100],
				},
				{
					parameters: {},
					id: 'c5c374f1-6fad-46bb-8eea-ceec126b300a',
					name: 'Community Installed Node',
					type: 'n8n-nodes-community-installed-node.communityInstalledNode',
					typeVersion: 1,
					position: [200, 200],
				},
				{
					parameters: {},
					id: 'c5c374f1-6fad-46bb-8eea-ceec126b300b',
					name: 'Community Installed Node 2',
					type: 'n8n-nodes-community-installed-node2.communityInstalledNode',
					typeVersion: 1,
					position: [300, 300],
				},
				{
					parameters: {
						options: {},
					},
					id: '198133b6-95dd-4f7e-90e5-e16c4cdbad12',
					name: 'Community Missing Node',
					type: 'community-missing-node.communityMissingNode',
					typeVersion: 1,
					position: [400, 400],
				},
			],
		};

		expect(
			generateNodesGraph(workflow, {
				...nodeTypes,
				getByNameAndVersion: (nodeType: string, version?: number) => {
					const orig = nodeTypes.getByNameAndVersion(nodeType, version);
					if (nodeType === 'n8n-nodes-community-installed-node.communityInstalledNode') {
						return {
							...orig,
							description: {
								...orig.description,
								communityNodePackageVersion: '1.0.0',
							},
						};
					}
					if (nodeType === 'n8n-nodes-community-installed-node2.communityInstalledNode') {
						return {
							...orig,
							description: {
								...orig.description,
								communityNodePackageVersion: '1.0.1',
							},
						};
					}
					return orig;
				},
			}),
		).toEqual({
			evaluationTriggerNodeNames: [],
			nameIndices: {
				'When clicking ‘Execute workflow’': '0',
				'Community Installed Node': '1',
				'Community Installed Node 2': '2',
				'Community Missing Node': '3',
			},
			webhookNodeNames: [],
			nodeGraph: {
				is_pinned: false,
				node_types: [
					'n8n-nodes-base.manualTrigger',
					'n8n-nodes-community-installed-node.communityInstalledNode',
					'n8n-nodes-community-installed-node2.communityInstalledNode',
					'community-missing-node.communityMissingNode',
				],
				node_connections: [],
				nodes: {
					'0': {
						id: 'fe69383c-e418-4f98-9c0e-924deafa7f93',
						type: 'n8n-nodes-base.manualTrigger',
						version: 1,
						position: [100, 100],
					},
					'1': {
						id: 'c5c374f1-6fad-46bb-8eea-ceec126b300a',
						type: 'n8n-nodes-community-installed-node.communityInstalledNode',
						version: 1,
						position: [200, 200],
						package_version: '1.0.0',
					},
					'2': {
						id: 'c5c374f1-6fad-46bb-8eea-ceec126b300b',
						type: 'n8n-nodes-community-installed-node2.communityInstalledNode',
						version: 1,
						position: [300, 300],
						package_version: '1.0.1',
					},
					'3': {
						id: '198133b6-95dd-4f7e-90e5-e16c4cdbad12',
						type: 'community-missing-node.communityMissingNode',
						version: 1,
						position: [400, 400],
					},
				},
				notes: {},
			},
		});
	});
});

describe('extractLastExecutedNodeCredentialData', () => {
	const cases: Array<[string, IRun]> = [
		['no data', mock<IRun>({ data: {} })],
		['no executionData', mock<IRun>({ data: { executionData: undefined } })],
		[
			'no nodeExecutionStack',
			mock<IRun>({ data: { executionData: { nodeExecutionStack: undefined } } }),
		],
		[
			'no node',
			mock<IRun>({
				data: { executionData: { nodeExecutionStack: [{ node: undefined }] } },
			}),
		],
		[
			'no credentials',
			mock<IRun>({
				data: { executionData: { nodeExecutionStack: [{ node: { credentials: undefined } }] } },
			}),
		],
	];

	test.each(cases)(
		'should return credentialId and credentialsType with null if %s',
		(_, runData) => {
			expect(extractLastExecutedNodeCredentialData(runData)).toBeNull();
		},
	);

	it('should return correct credentialId and credentialsType when last node executed has credential', () => {
		const runData = mock<IRun>({
			data: {
				executionData: {
					nodeExecutionStack: [{ node: { credentials: { openAiApi: { id: 'nhu-l8E4hX' } } } }],
				},
			},
		});

		expect(extractLastExecutedNodeCredentialData(runData)).toMatchObject(
			expect.objectContaining({ credentialId: 'nhu-l8E4hX', credentialType: 'openAiApi' }),
		);
	});
});

describe('userInInstanceRanOutOfFreeAiCredits', () => {
	it('should return false if could not find node credentials', () => {
		const runData = {
			status: 'error',
			mode: 'manual',
			data: {
				startData: {
					destinationNode: 'OpenAI',
					runNodeFilter: ['OpenAI'],
				},
				executionData: {
					nodeExecutionStack: [{ node: { credentials: {} } }],
				},
				resultData: {
					runData: {},
					lastNodeExecuted: 'OpenAI',
					error: new NodeApiError(
						{
							id: '1',
							typeVersion: 1,
							name: 'OpenAI',
							type: 'n8n-nodes-base.openAi',
							parameters: {},
							position: [100, 200],
						},
						{
							message: `400 - ${JSON.stringify({
								error: {
									message: 'error message',
									type: 'free_ai_credits_request_error',
									code: 200,
								},
							})}`,
							error: {
								message: 'error message',
								type: 'free_ai_credits_request_error',
								code: 200,
							},
						},
						{
							httpCode: '400',
						},
					),
				},
			},
		} as unknown as IRun;

		expect(userInInstanceRanOutOfFreeAiCredits(runData)).toBe(false);
	});

	it('should return false if could not credential type it is not openAiApi', () => {
		const runData = {
			status: 'error',
			mode: 'manual',
			data: {
				startData: {
					destinationNode: 'OpenAI',
					runNodeFilter: ['OpenAI'],
				},
				executionData: {
					nodeExecutionStack: [{ node: { credentials: { jiraApi: { id: 'nhu-l8E4hX' } } } }],
				},
				resultData: {
					runData: {},
					lastNodeExecuted: 'OpenAI',
					error: new NodeApiError(
						{
							id: '1',
							typeVersion: 1,
							name: 'OpenAI',
							type: 'n8n-nodes-base.openAi',
							parameters: {},
							position: [100, 200],
						},
						{
							message: `400 - ${JSON.stringify({
								error: {
									message: 'error message',
									type: 'free_ai_credits_request_error',
									code: 200,
								},
							})}`,
							error: {
								message: 'error message',
								type: 'free_ai_credits_request_error',
								code: 200,
							},
						},
						{
							httpCode: '400',
						},
					),
				},
			},
		} as unknown as IRun;

		expect(userInInstanceRanOutOfFreeAiCredits(runData)).toBe(false);
	});

	it('should return false if error is not NodeApiError', () => {
		const runData = {
			status: 'error',
			mode: 'manual',
			data: {
				startData: {
					destinationNode: 'OpenAI',
					runNodeFilter: ['OpenAI'],
				},
				executionData: {
					nodeExecutionStack: [{ node: { credentials: { openAiApi: { id: 'nhu-l8E4hX' } } } }],
				},
				resultData: {
					runData: {},
					lastNodeExecuted: 'OpenAI',
					error: new ExpressionError('error'),
				},
			},
		} as unknown as IRun;

		expect(userInInstanceRanOutOfFreeAiCredits(runData)).toBe(false);
	});

	it('should return false if error is not a free ai credit error', () => {
		const runData = {
			status: 'error',
			mode: 'manual',
			data: {
				startData: {
					destinationNode: 'OpenAI',
					runNodeFilter: ['OpenAI'],
				},
				executionData: {
					nodeExecutionStack: [{ node: { credentials: { openAiApi: { id: 'nhu-l8E4hX' } } } }],
				},
				resultData: {
					runData: {},
					lastNodeExecuted: 'OpenAI',
					error: new NodeApiError(
						{
							id: '1',
							typeVersion: 1,
							name: 'OpenAI',
							type: 'n8n-nodes-base.openAi',
							parameters: {},
							position: [100, 200],
						},
						{
							message: `400 - ${JSON.stringify({
								error: {
									message: 'error message',
									type: 'error_type',
									code: 200,
								},
							})}`,
							error: {
								message: 'error message',
								type: 'error_type',
								code: 200,
							},
						},
						{
							httpCode: '400',
						},
					),
				},
			},
		} as unknown as IRun;

		expect(userInInstanceRanOutOfFreeAiCredits(runData)).toBe(false);
	});

	it('should return true if the user has ran out of free AI credits', () => {
		const runData = {
			status: 'error',
			mode: 'manual',
			data: {
				startData: {
					destinationNode: 'OpenAI',
					runNodeFilter: ['OpenAI'],
				},
				executionData: {
					nodeExecutionStack: [{ node: { credentials: { openAiApi: { id: 'nhu-l8E4hX' } } } }],
				},
				resultData: {
					runData: {},
					lastNodeExecuted: 'OpenAI',
					error: new NodeApiError(
						{
							id: '1',
							typeVersion: 1,
							name: 'OpenAI',
							type: 'n8n-nodes-base.openAi',
							parameters: {},
							position: [100, 200],
						},
						{
							message: `400 - ${JSON.stringify({
								error: {
									message: 'error message',
									type: 'free_ai_credits_request_error',
									code: 400,
								},
							})}`,
							error: {
								message: 'error message',
								type: 'free_ai_credits_request_error',
								code: 400,
							},
						},
						{
							httpCode: '400',
						},
					),
				},
			},
		} as unknown as IRun;

		expect(userInInstanceRanOutOfFreeAiCredits(runData)).toBe(true);
	});
});

function validUrls(idMaker: typeof alphanumericId | typeof email, char = CHAR) {
	const firstId = idMaker();
	const secondId = idMaker();
	const firstIdObscured = char.repeat(firstId.length);
	const secondIdObscured = char.repeat(secondId.length);

	return [
		{
			full: `https://test.com/api/v1/users/${firstId}`,
			protocolPlusDomain: 'https://test.com',
			pathname: `/api/v1/users/${firstIdObscured}`,
		},
		{
			full: `https://test.com/api/v1/users/${firstId}/`,
			protocolPlusDomain: 'https://test.com',
			pathname: `/api/v1/users/${firstIdObscured}/`,
		},
		{
			full: `https://test.com/api/v1/users/${firstId}/posts/${secondId}`,
			protocolPlusDomain: 'https://test.com',
			pathname: `/api/v1/users/${firstIdObscured}/posts/${secondIdObscured}`,
		},
		{
			full: `https://test.com/api/v1/users/${firstId}/posts/${secondId}/`,
			protocolPlusDomain: 'https://test.com',
			pathname: `/api/v1/users/${firstIdObscured}/posts/${secondIdObscured}/`,
		},
		{
			full: `https://test.com/api/v1/users/${firstId}/posts/${secondId}/`,
			protocolPlusDomain: 'https://test.com',
			pathname: `/api/v1/users/${firstIdObscured}/posts/${secondIdObscured}/`,
		},
		{
			full: `https://test.com/api/v1/users?id=${firstId}`,
			protocolPlusDomain: 'https://test.com',
			pathname: '/api/v1/users',
		},
		{
			full: `https://test.com/api/v1/users?id=${firstId}&post=${secondId}`,
			protocolPlusDomain: 'https://test.com',
			pathname: '/api/v1/users',
		},
		{
			full: `https://test.com/api/v1/users/${firstId}/posts/${secondId}`,
			protocolPlusDomain: 'https://test.com',
			pathname: `/api/v1/users/${firstIdObscured}/posts/${secondIdObscured}`,
		},
	];
}

function malformedUrls(idMaker: typeof numericId | typeof email, char = CHAR) {
	const firstId = idMaker();
	const secondId = idMaker();
	const firstIdObscured = char.repeat(firstId.length);
	const secondIdObscured = char.repeat(secondId.length);

	return [
		{
			full: `test.com/api/v1/users/${firstId}/posts/${secondId}/`,
			protocolPlusDomain: 'test.com',
			pathname: `/api/v1/users/${firstIdObscured}/posts/${secondIdObscured}/`,
		},
		{
			full: `htp://test.com/api/v1/users/${firstId}/posts/${secondId}/`,
			protocolPlusDomain: 'htp://test.com',
			pathname: `/api/v1/users/${firstIdObscured}/posts/${secondIdObscured}/`,
		},
		{
			full: `test.com/api/v1/users?id=${firstId}`,
			protocolPlusDomain: 'test.com',
			pathname: '/api/v1/users',
		},
		{
			full: `test.com/api/v1/users?id=${firstId}&post=${secondId}`,
			protocolPlusDomain: 'test.com',
			pathname: '/api/v1/users',
		},
	];
}

const email = () => encodeURIComponent('test@test.com');

function uuidUrls(
	urlsMaker: typeof validUrls | typeof malformedUrls,
	baseName = 'test',
	namespaceUuid = uuidv4(),
) {
	return [
		...urlsMaker(() => uuidv5(baseName, namespaceUuid)),
		...urlsMaker(uuidv4),
		...urlsMaker(() => uuidv3(baseName, namespaceUuid)),
		...urlsMaker(uuidv1),
	];
}

function numericId(length = randomInt(1, 10)) {
	return Array.from({ length }, () => randomInt(10)).join('');
}

function alphanumericId() {
	return chooseRandomly([`john${numericId()}`, `title${numericId(1)}`, numericId()]);
}

const chooseRandomly = <T>(array: T[]) => array[randomInt(array.length)];

function generateTestWorkflowAndRunData(): { workflow: Partial<IWorkflowBase>; runData: IRunData } {
	const workflow: Partial<IWorkflowBase> = {
		nodes: [
			{
				parameters: {},
				id: 'a2372c14-87de-42de-9f9e-1c499aa2c279',
				name: 'Execute Workflow Trigger',
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion: 1,
				position: [1000, 240],
			},
			{
				parameters: {
					options: {},
				},
				id: '0f7aa00e-248c-452c-8cd0-62cb55941633',
				name: 'Edit Fields',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.1,
				position: [1460, 640],
			},
			{
				parameters: {
					options: {},
				},
				id: '9165c185-9f1c-4ec1-87bf-76ca66dfae38',
				name: 'Edit Fields1',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [1860, 260],
			},
			{
				parameters: {
					options: {},
				},
				id: '7a915fd5-5987-4ff1-9509-06b24a0a4613',
				name: 'Edit Fields2',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [1940, 680],
			},
			{
				parameters: {
					category: 'randomData',
					randomDataSeed: '0',
					randomDataCount: 3,
				},
				id: '63050e7c-8ad5-4f44-8fdd-da555e40471b',
				name: 'DebugHelper',
				type: 'n8n-nodes-base.debugHelper',
				typeVersion: 1,
				position: [1220, 240],
			},
			{
				id: 'fbf7525d-2d1d-4dcf-97a0-43b53d087ef3',
				name: 'Switch',
				type: 'n8n-nodes-base.switch',
				typeVersion: 3.2,
				position: [1680, 640],
				parameters: {},
			},
		],
		connections: {
			'Execute Workflow Trigger': {
				main: [
					[
						{
							node: 'Edit Fields',
							type: 'main' as NodeConnectionType,
							index: 0,
						},
						{
							node: 'DebugHelper',
							type: 'main' as NodeConnectionType,
							index: 0,
						},
					],
				],
			},
			'Edit Fields': {
				main: [
					[
						{
							node: 'Switch',
							type: 'main' as NodeConnectionType,
							index: 0,
						},
					],
				],
			},
			DebugHelper: {
				main: [
					[
						{
							node: 'Edit Fields',
							type: 'main' as NodeConnectionType,
							index: 0,
						},
					],
				],
			},
			Switch: {
				main: [
					null,
					null,
					[
						{
							node: 'Edit Fields1',
							type: 'main' as NodeConnectionType,
							index: 0,
						},
					],
					[
						{
							node: 'Edit Fields2',
							type: 'main' as NodeConnectionType,
							index: 0,
						},
					],
				],
			},
		},
		pinData: {},
	};

	const runData: IRunData = {
		'Execute Workflow Trigger': [
			{
				hints: [],
				startTime: 1727793340927,
				executionTime: 0,
				executionIndex: 0,
				source: [],
				executionStatus: 'success',
				data: { main: [[{ json: {}, pairedItem: { item: 0 } }]] },
			},
		],
		DebugHelper: [
			{
				hints: [],
				startTime: 1727793340928,
				executionTime: 0,
				executionIndex: 1,
				source: [{ previousNode: 'Execute Workflow Trigger' }],
				executionStatus: 'success',
				data: {
					main: [
						[
							{
								json: {
									test: 'abc',
								},
								pairedItem: { item: 0 },
							},
							{
								json: {
									test: 'abc',
								},
								pairedItem: { item: 0 },
							},
							{
								json: {
									test: 'abc',
								},
								pairedItem: { item: 0 },
							},
						],
					],
				},
			},
		],
		'Edit Fields': [
			{
				hints: [],
				startTime: 1727793340928,
				executionTime: 1,
				executionIndex: 2,
				source: [{ previousNode: 'DebugHelper' }],
				executionStatus: 'success',
				data: {
					main: [
						[
							{
								json: {
									test: 'abc',
								},
								pairedItem: { item: 0 },
							},
							{
								json: {
									test: 'abc',
								},
								pairedItem: { item: 1 },
							},
							{
								json: {
									test: 'abc',
								},
								pairedItem: { item: 2 },
							},
						],
					],
				},
			},
			{
				hints: [],
				startTime: 1727793340931,
				executionTime: 0,
				executionIndex: 3,
				source: [{ previousNode: 'Execute Workflow Trigger' }],
				executionStatus: 'success',
				data: { main: [[{ json: {}, pairedItem: { item: 0 } }]] },
			},
		],
		Switch: [
			{
				hints: [],
				startTime: 1727793340929,
				executionTime: 1,
				executionIndex: 4,
				source: [{ previousNode: 'Edit Fields' }],
				executionStatus: 'success',
				data: {
					main: [
						[],
						[],
						[
							{
								json: {
									test: 'abc',
								},
								pairedItem: { item: 0 },
							},
							{
								json: {
									test: 'abc',
								},
								pairedItem: { item: 1 },
							},
							{
								json: {
									test: 'abc',
								},
								pairedItem: { item: 2 },
							},
						],
						[],
					],
				},
			},
			{
				hints: [],
				startTime: 1727793340931,
				executionTime: 0,
				executionIndex: 5,
				source: [{ previousNode: 'Edit Fields', previousNodeRun: 1 }],
				executionStatus: 'success',
				data: { main: [[], [], [{ json: {}, pairedItem: { item: 0 } }], []] },
			},
		],
		'Edit Fields1': [
			{
				hints: [],
				startTime: 1727793340930,
				executionTime: 0,
				executionIndex: 6,
				source: [{ previousNode: 'Switch', previousNodeOutput: 2 }],
				executionStatus: 'success',
				data: {
					main: [
						[
							{ json: {}, pairedItem: { item: 0 } },
							{ json: {}, pairedItem: { item: 1 } },
							{ json: {}, pairedItem: { item: 2 } },
						],
					],
				},
			},
			{
				hints: [],
				startTime: 1727793340932,
				executionTime: 1,
				executionIndex: 7,
				source: [{ previousNode: 'Switch', previousNodeOutput: 2, previousNodeRun: 1 }],
				executionStatus: 'success',
				data: { main: [[{ json: {}, pairedItem: { item: 0 } }]] },
			},
		],
	};

	return { workflow, runData };
}

describe('makeAIMetrics', () => {
	const makeNode = (parameters: object, type: string) =>
		({
			parameters,
			type,
			typeVersion: 2.1,
			id: '7cb0b373-715c-4a89-8bbb-3f238907bc86',
			name: 'a name',
			position: [0, 0],
		}) as INode;

	it('should count applicable nodes and parameters', () => {
		const nodes = [
			makeNode(
				{
					sendTo: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('To', ``, 'string') }}",
					sendTwo: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('To', ``, 'string') }}",
					subject: "={{ $fromAI('Subject', ``, 'string') }}",
				},
				'n8n-nodes-base.gmailTool',
			),
			makeNode(
				{
					subject: "={{ $fromAI('Subject', ``, 'string') }}",
					verb: "={{ $fromAI('Verb', ``, 'string') }}",
				},
				'n8n-nodes-base.gmailTool',
			),
			makeNode(
				{
					subject: "'A Subject'",
				},
				'n8n-nodes-base.gmailTool',
			),
		];

		const nodeTypes = mock<NodeTypes>({
			getByNameAndVersion: () => ({
				description: {
					codex: {
						categories: ['AI'],
						subcategories: { AI: ['Tools'] },
					},
				} as unknown as INodeTypeDescription,
			}),
		});

		const result = resolveAIMetrics(nodes, nodeTypes);
		expect(result).toMatchObject({
			aiNodeCount: 3,
			aiToolCount: 3,
			fromAIOverrideCount: 2,
			fromAIExpressionCount: 3,
		});
	});

	it('should not count non-applicable nodes and parameters', () => {
		const nodes = [
			makeNode(
				{
					sendTo: 'someone',
				},
				'n8n-nodes-base.gmail',
			),
		];

		const nodeTypes = mock<NodeTypes>({
			getByNameAndVersion: () => ({
				description: {} as unknown as INodeTypeDescription,
			}),
		});

		const result = resolveAIMetrics(nodes, nodeTypes);
		expect(result).toMatchObject({});
	});

	it('should count ai nodes without tools', () => {
		const nodes = [
			makeNode(
				{
					sendTo: 'someone',
				},
				'n8n-nodes-base.gmailTool',
			),
		];

		const nodeTypes = mock<NodeTypes>({
			getByNameAndVersion: () => ({
				description: {
					codex: {
						categories: ['AI'],
					},
				} as unknown as INodeTypeDescription,
			}),
		});

		const result = resolveAIMetrics(nodes, nodeTypes);
		expect(result).toMatchObject({
			aiNodeCount: 1,
			aiToolCount: 0,
			fromAIOverrideCount: 0,
			fromAIExpressionCount: 0,
		});
	});
});

describe('resolveVectorStoreMetrics', () => {
	const makeNode = (parameters: object, type: string) =>
		({
			parameters,
			type,
			typeVersion: 1,
			id: '7cb0b373-715c-4a89-8bbb-3f238907bc86',
			name: 'a name',
			position: [0, 0],
		}) as INode;

	it('should return empty object if no vector store nodes are present', () => {
		const nodes = [
			makeNode(
				{
					mode: 'insert',
				},
				'n8n-nodes-base.nonVectorStoreNode',
			),
		];

		const nodeTypes = mock<NodeTypes>({
			getByNameAndVersion: () => ({
				description: {
					codex: {
						categories: ['Non-AI'],
					},
				} as unknown as INodeTypeDescription,
			}),
		});

		const run = mock<IRun>({
			data: {
				resultData: {
					runData: {},
				},
			},
		});

		const result = resolveVectorStoreMetrics(nodes, nodeTypes, run);
		expect(result).toMatchObject({});
	});

	it('should detect vector store nodes that inserted data', () => {
		const nodes = [
			makeNode(
				{
					mode: 'insert',
				},
				'n8n-nodes-base.vectorStoreNode',
			),
		];

		const nodeTypes = mock<NodeTypes>({
			getByNameAndVersion: () => ({
				description: {
					codex: {
						categories: ['AI'],
						subcategories: { AI: ['Vector Stores'] },
					},
				} as unknown as INodeTypeDescription,
			}),
		});

		const run = mock<IRun>({
			data: {
				resultData: {
					runData: {
						'a name': [
							{
								executionStatus: 'success',
							},
						],
					},
				},
			},
		});

		const result = resolveVectorStoreMetrics(nodes, nodeTypes, run);
		expect(result).toMatchObject({
			insertedIntoVectorStore: true,
			queriedDataFromVectorStore: false,
		});
	});

	it('should detect vector store nodes that queried data', () => {
		const nodes = [
			makeNode(
				{
					mode: 'retrieve',
				},
				'n8n-nodes-base.vectorStoreNode',
			),
		];

		const nodeTypes = mock<NodeTypes>({
			getByNameAndVersion: () => ({
				description: {
					codex: {
						categories: ['AI'],
						subcategories: { AI: ['Vector Stores'] },
					},
				} as unknown as INodeTypeDescription,
			}),
		});

		const run = mock<IRun>({
			data: {
				resultData: {
					runData: {
						'a name': [
							{
								executionStatus: 'success',
							},
						],
					},
				},
			},
		});

		const result = resolveVectorStoreMetrics(nodes, nodeTypes, run);
		expect(result).toMatchObject({
			insertedIntoVectorStore: false,
			queriedDataFromVectorStore: true,
		});
	});

	it('should detect vector store nodes that both inserted and queried data', () => {
		const nodes = [
			makeNode(
				{
					mode: 'insert',
				},
				'n8n-nodes-base.vectorStoreNode',
			),
			makeNode(
				{
					mode: 'retrieve',
				},
				'n8n-nodes-base.vectorStoreNode',
			),
		];

		const nodeTypes = mock<NodeTypes>({
			getByNameAndVersion: () => ({
				description: {
					codex: {
						categories: ['AI'],
						subcategories: { AI: ['Vector Stores'] },
					},
				} as unknown as INodeTypeDescription,
			}),
		});

		const run = mock<IRun>({
			data: {
				resultData: {
					runData: {
						'a name': [
							{
								executionStatus: 'success',
							},
						],
					},
				},
			},
		});

		const result = resolveVectorStoreMetrics(nodes, nodeTypes, run);
		expect(result).toMatchObject({
			insertedIntoVectorStore: true,
			queriedDataFromVectorStore: true,
		});
	});

	it('should return empty object if no successful executions are found', () => {
		const nodes = [
			makeNode(
				{
					mode: 'insert',
				},
				'n8n-nodes-base.vectorStoreNode',
			),
		];

		const nodeTypes = mock<NodeTypes>({
			getByNameAndVersion: () => ({
				description: {
					codex: {
						categories: ['AI'],
						subcategories: { AI: ['Vector Stores'] },
					},
				} as unknown as INodeTypeDescription,
			}),
		});

		const run = mock<IRun>({
			data: {
				resultData: {
					runData: {
						'a name': [
							{
								executionStatus: 'error',
							},
						],
					},
				},
			},
		});

		const result = resolveVectorStoreMetrics(nodes, nodeTypes, run);
		expect(result).toMatchObject({
			insertedIntoVectorStore: false,
			queriedDataFromVectorStore: false,
		});
	});
});

describe('extractLastExecutedNodeStructuredOutputErrorInfo', () => {
	const mockWorkflow = (nodes: INode[], connections?: any): IWorkflowBase => ({
		createdAt: new Date(),
		updatedAt: new Date(),
		id: 'test-workflow',
		name: 'Test Workflow',
		active: false,
		isArchived: false,
		nodes,
		connections: connections || {},
		settings: {},
		pinData: {},
		versionId: 'test-version',
	});

	const mockAgentNode = (name = 'Agent', hasOutputParser = true): INode => ({
		id: 'agent-node-id',
		name,
		type: '@n8n/n8n-nodes-langchain.agent',
		typeVersion: 1,
		position: [100, 100],
		parameters: {
			hasOutputParser,
		},
	});

	const mockLanguageModelNode = (name = 'Model', model = 'gpt-4'): INode => ({
		id: 'model-node-id',
		name,
		type: 'n8n-nodes-langchain.lmChatOpenAi',
		typeVersion: 1,
		position: [200, 200],
		parameters: {
			model,
		},
	});

	const mockToolNode = (name: string): INode => ({
		id: `tool-${name}`,
		name,
		type: 'n8n-nodes-base.httpRequestTool',
		typeVersion: 1,
		position: [300, 300],
		parameters: {},
	});

	const mockRunData = (lastNodeExecuted: string, error?: any, nodeRunData?: any): IRun => ({
		mode: 'manual',
		status: error ? 'error' : 'success',
		startedAt: new Date(),
		stoppedAt: new Date(),
		data: {
			startData: {},
			resultData: {
				lastNodeExecuted,
				error,
				runData: nodeRunData || {},
			},
		} as any,
	});

	it('should return empty object when there is no error', () => {
		const workflow = mockWorkflow([mockAgentNode()]);
		const runData = mockRunData('Agent');

		const result = extractLastExecutedNodeStructuredOutputErrorInfo(workflow, nodeTypes, runData);
		expect(result).toEqual({});
	});

	it('should return empty object when lastNodeExecuted is not defined', () => {
		const workflow = mockWorkflow([mockAgentNode()]);
		const runData = mockRunData('', new Error('Some error'));

		const result = extractLastExecutedNodeStructuredOutputErrorInfo(workflow, nodeTypes, runData);
		expect(result).toEqual({});
	});

	it('should return empty object when last executed node is not found in workflow', () => {
		const workflow = mockWorkflow([mockAgentNode('Agent')]);
		const runData = mockRunData('NonExistentNode', new Error('Some error'));

		const result = extractLastExecutedNodeStructuredOutputErrorInfo(workflow, nodeTypes, runData);
		expect(result).toEqual({});
	});

	it('should return empty object when last executed node is not an agent node', () => {
		const workflow = mockWorkflow([mockLanguageModelNode('Model')]);
		const runData = mockRunData('Model', new Error('Some error'));

		const result = extractLastExecutedNodeStructuredOutputErrorInfo(workflow, nodeTypes, runData);
		expect(result).toEqual({});
	});

	it('should return empty object when agent node does not have output parser', () => {
		const workflow = mockWorkflow([mockAgentNode('Agent', false)]);
		const runData = mockRunData('Agent', new Error('Some error'));

		const result = extractLastExecutedNodeStructuredOutputErrorInfo(workflow, nodeTypes, runData);
		expect(result).toEqual({});
	});

	it('should return error info without output parser fail reason when error is not output parser error', () => {
		const workflow = mockWorkflow([mockAgentNode()]);
		const runData = mockRunData('Agent', new Error('Different error'), {
			Agent: [
				{
					error: {
						message: 'Some other error',
					},
				},
			],
		});

		const result = extractLastExecutedNodeStructuredOutputErrorInfo(workflow, nodeTypes, runData);
		expect(result).toEqual({
			num_tools: 0,
		});
	});

	it('should return error info with output parser fail reason', () => {
		const workflow = mockWorkflow([mockAgentNode()]);
		const runData = mockRunData('Agent', new Error('Some error'), {
			Agent: [
				{
					error: {
						message: "Model output doesn't fit required format",
						context: {
							outputParserFailReason: 'Failed to parse JSON output',
						},
					},
				},
			],
		});

		const result = extractLastExecutedNodeStructuredOutputErrorInfo(workflow, nodeTypes, runData);
		expect(result).toEqual({
			output_parser_fail_reason: 'Failed to parse JSON output',
			num_tools: 0,
		});
	});

	it('should count connected tools correctly', () => {
		const agentNode = mockAgentNode();
		const tool1 = mockToolNode('Tool1');
		const tool2 = mockToolNode('Tool2');
		const workflow = mockWorkflow([agentNode, tool1, tool2], {
			Tool1: {
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
			Tool2: {
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		});
		const runData = mockRunData('Agent', new Error('Some error'));

		const result = extractLastExecutedNodeStructuredOutputErrorInfo(workflow, nodeTypes, runData);
		expect(result).toEqual({
			num_tools: 2,
		});
	});

	it('should extract model name from connected language model node', () => {
		const agentNode = mockAgentNode();
		const modelNode = mockLanguageModelNode('OpenAI Model', 'gpt-4-turbo');
		const workflow = mockWorkflow([agentNode, modelNode], {
			'OpenAI Model': {
				[NodeConnectionTypes.AiLanguageModel]: [
					[{ node: 'Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
				],
			},
		});
		const runData = mockRunData('Agent', new Error('Some error'));
		vi.spyOn(nodeHelpers, 'getNodeParameters').mockReturnValueOnce(
			mock<INodeParameters>({ model: { value: 'gpt-4-turbo' } }),
		);

		const result = extractLastExecutedNodeStructuredOutputErrorInfo(workflow, nodeTypes, runData);
		expect(result).toEqual({
			num_tools: 0,
			model_name: 'gpt-4-turbo',
		});
	});

	it('should handle complete scenario with tools, model, and output parser error', () => {
		const agentNode = mockAgentNode();
		const modelNode = mockLanguageModelNode('OpenAI Model', 'gpt-4');
		const tool1 = mockToolNode('HTTPTool');
		const tool2 = mockToolNode('SlackTool');
		const tool3 = mockToolNode('GoogleSheetsTool');

		const workflow = mockWorkflow([agentNode, modelNode, tool1, tool2, tool3], {
			'OpenAI Model': {
				[NodeConnectionTypes.AiLanguageModel]: [
					[{ node: 'Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
				],
			},
			HTTPTool: {
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
			SlackTool: {
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
			GoogleSheetsTool: {
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		});

		const runData = mockRunData('Agent', new Error('Workflow error'), {
			Agent: [
				{
					error: {
						message: "Model output doesn't fit required format",
						context: {
							outputParserFailReason: 'Invalid JSON structure: Expected object, got string',
						},
					},
				},
			],
		});

		vi.spyOn(nodeHelpers, 'getNodeParameters').mockReturnValueOnce(
			mock<INodeParameters>({ model: { value: 'gpt-4.1-mini' } }),
		);

		const result = extractLastExecutedNodeStructuredOutputErrorInfo(workflow, nodeTypes, runData);
		expect(result).toEqual({
			output_parser_fail_reason: 'Invalid JSON structure: Expected object, got string',
			num_tools: 3,
			model_name: 'gpt-4.1-mini',
		});
	});

	it('should pick correct model when workflow has multiple model nodes but only one connected to agent', () => {
		const agentNode = mockAgentNode();
		const connectedModel = mockLanguageModelNode('Connected Model', 'gpt-4');
		const unconnectedModel = mockLanguageModelNode('Unconnected Model', 'claude-3');

		const workflow = mockWorkflow([agentNode, connectedModel, unconnectedModel], {
			'Connected Model': {
				[NodeConnectionTypes.AiLanguageModel]: [
					[{ node: 'Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
				],
			},
			// Unconnected Model is not connected to anything
		});

		const runData = mockRunData('Agent', new Error('Some error'));

		vi.spyOn(nodeHelpers, 'getNodeParameters').mockReturnValueOnce(
			mock<INodeParameters>({ model: 'gpt-4' }),
		);

		const result = extractLastExecutedNodeStructuredOutputErrorInfo(workflow, nodeTypes, runData);
		expect(result).toEqual({
			num_tools: 0,
			model_name: 'gpt-4',
		});
	});

	it('should only count tools connected to the agent when workflow has multiple tool nodes', () => {
		const agentNode = mockAgentNode();
		const connectedTool1 = mockToolNode('ConnectedTool1');
		const connectedTool2 = mockToolNode('ConnectedTool2');
		const unconnectedTool1 = mockToolNode('UnconnectedTool1');
		const unconnectedTool2 = mockToolNode('UnconnectedTool2');
		const someOtherNode: INode = {
			id: 'other-node',
			name: 'SomeOtherNode',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [400, 400],
			parameters: {},
		};

		const workflow = mockWorkflow(
			[
				agentNode,
				connectedTool1,
				connectedTool2,
				unconnectedTool1,
				unconnectedTool2,
				someOtherNode,
			],
			{
				ConnectedTool1: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
				ConnectedTool2: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
				// UnconnectedTool1 and UnconnectedTool2 are connected to SomeOtherNode, not to Agent
				UnconnectedTool1: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'SomeOtherNode', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
				UnconnectedTool2: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'SomeOtherNode', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
			},
		);

		const runData = mockRunData('Agent', new Error('Some error'));

		const result = extractLastExecutedNodeStructuredOutputErrorInfo(workflow, nodeTypes, runData);
		expect(result).toEqual({
			num_tools: 2, // Only ConnectedTool1 and ConnectedTool2
		});
	});

	it('should extract model name from modelName parameter when model parameter is not present', () => {
		const agentNode = mockAgentNode();
		const modelNode: INode = {
			id: 'model-node-id',
			name: 'Google Gemini Model',
			type: 'n8n-nodes-langchain.lmChatGoogleGemini',
			typeVersion: 1,
			position: [200, 200],
			parameters: {
				// Using modelName instead of model
				modelName: 'gemini-1.5-pro',
			},
		};
		const workflow = mockWorkflow([agentNode, modelNode], {
			'Google Gemini Model': {
				[NodeConnectionTypes.AiLanguageModel]: [
					[{ node: 'Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
				],
			},
		});
		const runData = mockRunData('Agent', new Error('Some error'));

		vi.spyOn(nodeHelpers, 'getNodeParameters').mockReturnValueOnce(
			mock<INodeParameters>({ modelName: 'gemini-1.5-pro' }),
		);

		const result = extractLastExecutedNodeStructuredOutputErrorInfo(workflow, nodeTypes, runData);
		expect(result).toEqual({
			num_tools: 0,
			model_name: 'gemini-1.5-pro',
		});
	});

	it('should capture Agent node streaming parameters', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						agent: 'toolsAgent',
						options: {
							enableStreaming: false,
						},
					},
					id: 'agent-id-streaming-disabled',
					name: 'Agent with streaming disabled',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2.1,
					position: [100, 100],
				},
				{
					parameters: {
						agent: 'conversationalAgent',
						options: {
							enableStreaming: true,
						},
					},
					id: 'agent-id-streaming-enabled',
					name: 'Agent with streaming enabled',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2.1,
					position: [300, 100],
				},
				{
					parameters: {
						agent: 'openAiFunctionsAgent',
					},
					id: 'agent-id-default-streaming',
					name: 'Agent with default streaming',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 2.1,
					position: [500, 100],
				},
			],
			connections: {},
		};

		const result = generateNodesGraph(workflow, nodeTypes);

		expect(result.nodeGraph.nodes['0']).toEqual({
			id: 'agent-id-streaming-disabled',
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			position: [100, 100],
			agent: 'toolsAgent',
			is_streaming: false,
		});

		expect(result.nodeGraph.nodes['1']).toEqual({
			id: 'agent-id-streaming-enabled',
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			position: [300, 100],
			agent: 'conversationalAgent',
			is_streaming: true,
		});

		expect(result.nodeGraph.nodes['2']).toEqual({
			id: 'agent-id-default-streaming',
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			position: [500, 100],
			agent: 'openAiFunctionsAgent',
			is_streaming: true,
		});
	});

	it('should capture Chat Trigger node streaming parameters', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {
						public: true,
						options: {
							responseMode: 'streaming',
						},
					},
					id: 'chat-trigger-id',
					name: 'Chat Trigger',
					type: '@n8n/n8n-nodes-langchain.chatTrigger',
					typeVersion: 1,
					position: [100, 100],
				},
				{
					parameters: {
						public: false,
						options: {
							responseMode: 'lastNode',
						},
					},
					id: 'chat-trigger-id-2',
					name: 'Chat Trigger 2',
					type: '@n8n/n8n-nodes-langchain.chatTrigger',
					typeVersion: 1,
					position: [300, 100],
				},
			],
			connections: {},
		};

		const result = generateNodesGraph(workflow, nodeTypes);

		expect(result.nodeGraph.nodes['0']).toEqual({
			id: 'chat-trigger-id',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1,
			position: [100, 100],
			response_mode: 'streaming',
			public_chat: true,
		});

		expect(result.nodeGraph.nodes['1']).toEqual({
			id: 'chat-trigger-id-2',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1,
			position: [300, 100],
			response_mode: 'lastNode',
			public_chat: false,
		});
	});
});
