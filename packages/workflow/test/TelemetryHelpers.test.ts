import { v5 as uuidv5, v3 as uuidv3, v4 as uuidv4, v1 as uuidv1 } from 'uuid';
import {
	ANONYMIZATION_CHARACTER as CHAR,
	generateNodesGraph,
	getDomainBase,
	getDomainPath,
} from '@/TelemetryHelpers';
import { ApplicationError, STICKY_NODE_TYPE, type IWorkflowBase } from '@/index';
import { nodeTypes } from './ExpressionExtensions/Helpers';
import { mock } from 'jest-mock-extended';
import * as nodeHelpers from '@/NodeHelpers';

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
					main: [[{ node: 'Google Sheets', type: 'main', index: 0 }]],
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
		});
	});

	test('should return node graph when workflow is empty', () => {
		const workflow: IWorkflowBase = {
			createdAt: new Date('2024-01-05T13:49:14.244Z'),
			updatedAt: new Date('2024-01-05T15:44:31.000Z'),
			id: 'NfV4GV9aQTifSLc2',
			name: 'My workflow 26',
			active: false,
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
		});
	});

	test('should return node graph when node has multiple operation fields with different display options', () => {
		const workflow: IWorkflowBase = {
			createdAt: new Date('2024-01-05T13:49:14.244Z'),
			updatedAt: new Date('2024-01-05T15:44:31.000Z'),
			id: 'NfV4GV9aQTifSLc2',
			name: 'My workflow 26',
			active: false,
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
					main: [[{ node: 'Google Sheets', type: 'main', index: 0 }]],
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
		});
	});

	test('should return node graph with stickies of default size', () => {
		const workflow: IWorkflowBase = {
			createdAt: new Date('2024-01-05T13:49:14.244Z'),
			updatedAt: new Date('2024-01-05T15:44:31.000Z'),
			id: 'NfV4GV9aQTifSLc2',
			name: 'My workflow 26',
			active: false,
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
					main: [[{ node: 'Google Sheets', type: 'main', index: 0 }]],
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
		});
	});

	test('should return node graph with stickies indicating overlap', () => {
		const workflow: IWorkflowBase = {
			createdAt: new Date('2024-01-05T13:49:14.244Z'),
			updatedAt: new Date('2024-01-05T15:44:31.000Z'),
			id: 'NfV4GV9aQTifSLc2',
			name: 'My workflow 26',
			active: false,
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
					main: [[{ node: 'Google Sheets', type: 'main', index: 0 }]],
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
			nodeGraph: {
				node_types: ['n8n-nodes-base.webhook'],
				node_connections: [],
				nodes: {
					'0': {
						id: '5e49e129-2c59-4650-95ea-14d4b94db1f3',
						type: 'n8n-nodes-base.webhook',
						version: 1.1,
						position: [520, 380],
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
		});
	});

	test('should support custom connections like in AI nodes', () => {
		const workflow: Partial<IWorkflowBase> = {
			nodes: [
				{
					parameters: {},
					id: 'fe69383c-e418-4f98-9c0e-924deafa7f93',
					name: 'When clicking ‘Test workflow’',
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
				'When clicking ‘Test workflow’': {
					main: [
						[
							{
								node: 'Chain',
								type: 'main',
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
								type: 'ai_languageModel',
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
				'When clicking ‘Test workflow’': '0',
				Chain: '1',
				Model: '2',
			},
			webhookNodeNames: [],
		});
	});

	test('should not fail on error to resolve a node parameter for sticky node type', () => {
		const workflow = mock<IWorkflowBase>({ nodes: [{ type: STICKY_NODE_TYPE }] });

		jest.spyOn(nodeHelpers, 'getNodeParameters').mockImplementationOnce(() => {
			throw new ApplicationError('Could not find property option');
		});

		expect(() => generateNodesGraph(workflow, nodeTypes)).not.toThrow();
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

function digit() {
	return Math.floor(Math.random() * 10);
}

function positiveDigit(): number {
	const d = digit();

	return d === 0 ? positiveDigit() : d;
}

function numericId(length = positiveDigit()) {
	return Array.from({ length }, digit).join('');
}

function alphanumericId() {
	return chooseRandomly([`john${numericId()}`, `title${numericId(1)}`, numericId()]);
}

const chooseRandomly = <T>(array: T[]) => array[Math.floor(Math.random() * array.length)];
