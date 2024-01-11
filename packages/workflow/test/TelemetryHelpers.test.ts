import { v5 as uuidv5, v3 as uuidv3, v4 as uuidv4, v1 as uuidv1 } from 'uuid';
import {
	ANONYMIZATION_CHARACTER as CHAR,
	generateNodesGraph,
	getDomainBase,
	getDomainPath,
} from '@/TelemetryHelpers';
import type { IWorkflowBase } from '@/index';
import { nodeTypes } from './ExpressionExtensions/Helpers';

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

	test('should return node graph with both notes and nodes', () => {
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
				notes: { '0': { overlapping: false, position: [240, 140], height: 0, width: 0 } },
				is_pinned: false,
			},
			nameIndices: { 'When clicking "Execute Workflow"': '0', 'Google Sheets': '1' },
			webhookNodeNames: [],
		});
	});

	test('should return node graph with notes indicating overlap', () => {
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
