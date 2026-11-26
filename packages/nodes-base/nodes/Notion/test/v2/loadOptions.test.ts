import { Container } from '@n8n/di';
import { InstanceSettings, LoadOptionsContext } from 'n8n-core';
import type {
	ILoadOptionsFunctions,
	INode,
	INodeParameters,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { requestPath, Workflow } from 'n8n-workflow';
import { rmSync } from 'node:fs';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { Notion } from '../../Notion.node';
import * as GenericFunctions from '../../shared/GenericFunctions';
import { getDatabaseIdFromPage, getDatabaseOptionsFromPage } from '../../v2/methods/loadOptions';

const userFolder = await vi.hoisted(async () => {
	const { mkdtempSync } = await import('node:fs');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const folder = mkdtempSync(join(tmpdir(), 'n8n-notion-load-options-test-'));
	vi.stubEnv('N8N_USER_FOLDER', folder);
	return folder;
});

vi.mock('../../shared/GenericFunctions', async () => ({
	...(await vi.importActual<typeof GenericFunctions>('../../shared/GenericFunctions')),
	notionApiRequest: vi.fn(),
}));

const mockNotionApiRequest = GenericFunctions.notionApiRequest as Mock;

function createMockLoadOptionsContext(parameters: Record<string, unknown>): ILoadOptionsFunctions {
	return {
		getCurrentNodeParameter: vi.fn((name: string) => parameters[name]),
	} as unknown as ILoadOptionsFunctions;
}

function createNotionV2LoadOptionsContext(
	currentNodeParameters: INodeParameters,
	path = 'parameters.propertiesUi.propertyValues[0].key',
): LoadOptionsContext {
	const notionV2 = new Notion().getNodeType(2.2);
	const nodeTypes = mock<INodeTypes>();
	nodeTypes.getByNameAndVersion.mockReturnValue(notionV2);

	const node: INode = {
		id: 'notion-node',
		name: 'Notion',
		type: 'n8n-nodes-base.notion',
		typeVersion: 2.2,
		position: [0, 0],
		parameters: currentNodeParameters,
	};

	const workflow = new Workflow({
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes,
	});

	const additionalData = mock<IWorkflowExecuteAdditionalData>();
	// Assign directly so vitest-mock-extended does not wrap parameter objects in mock proxies.
	additionalData.currentNodeParameters = currentNodeParameters;

	return new LoadOptionsContext(workflow, node, additionalData, path);
}

describe('Notion V2 load options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(InstanceSettings, mock<InstanceSettings>());
	});

	afterEach(() => {
		Container.reset();
	});

	afterAll(() => {
		vi.unstubAllEnvs();
		rmSync(userFolder, { recursive: true, force: true });
	});

	it('returns no options when database options are requested without a page', async () => {
		const context = createMockLoadOptionsContext({ pageId: null });

		const result = await getDatabaseOptionsFromPage.call(context);

		expect(result).toEqual([]);
	});

	describe('getDatabaseIdFromPage', () => {
		it('returns sorted writable database properties for a valid database page URL', async () => {
			const pageId = '4eb10d5001254b7faaa831d72d9445aa';
			mockNotionApiRequest
				.mockResolvedValueOnce({ parent: { database_id: 'database-123' } })
				.mockResolvedValueOnce({
					properties: {
						Status: { type: 'select' },
						Name: { type: 'title' },
						Created: { type: 'created_time' },
					},
				});

			const context = createNotionV2LoadOptionsContext({
				resource: 'databasePage',
				operation: 'update',
				pageId: {
					__rl: true,
					mode: 'url',
					value: `https://www.notion.com/My-Database-Page-${pageId}`,
				},
			});

			const result = await getDatabaseIdFromPage.call(context);

			expect(result).toEqual([
				{ name: 'Name', value: 'Name|title' },
				{ name: 'Status', value: 'Status|select' },
			]);
			expect(mockNotionApiRequest).toHaveBeenNthCalledWith(1, 'GET', requestPath`/pages/${pageId}`);
			expect(mockNotionApiRequest).toHaveBeenNthCalledWith(
				2,
				'GET',
				requestPath`/databases/database-123`,
			);
		});

		// NODE-5796: JSON serialization removes `value: undefined` when a resourceLocator
		// expression has no resolved data. `extractValue` then returns the non-string value
		// unchanged, and `extractPageId` throws a TypeError on `.includes()`.
		it.each([
			['incomplete url resourceLocator object', { __rl: true, mode: 'url' }],
			['incomplete id resourceLocator object', { __rl: true, mode: 'id' }],
			['null value', null],
			['numeric value', 12345],
			['empty string', ''],
		])('returns no options when pageId resolves to %s', async (_label, pageId) => {
			const context = createNotionV2LoadOptionsContext({
				resource: 'databasePage',
				operation: 'update',
				pageId,
			});

			const result = await getDatabaseIdFromPage.call(context);

			expect(result).toEqual([]);
			expect(mockNotionApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('getDatabaseOptionsFromPage', () => {
		it('returns select options for a valid database page URL', async () => {
			const pageId = '4eb10d5001254b7faaa831d72d9445aa';
			mockNotionApiRequest
				.mockResolvedValueOnce({ parent: { database_id: 'database-123' } })
				.mockResolvedValueOnce({
					properties: {
						Status: {
							type: 'select',
							select: { options: [{ name: 'In Progress' }, { name: 'Done' }] },
						},
					},
				});

			const context = createNotionV2LoadOptionsContext(
				{
					resource: 'databasePage',
					operation: 'update',
					pageId: {
						__rl: true,
						mode: 'url',
						value: `https://www.notion.com/My-Database-Page-${pageId}`,
					},
					propertiesUi: {
						propertyValues: [{ key: 'Status|select', type: 'select' }],
					},
				},
				'parameters.propertiesUi.propertyValues[0].selectValue',
			);

			const result = await getDatabaseOptionsFromPage.call(context);

			expect(result).toEqual([
				{ name: 'In Progress', value: 'In Progress' },
				{ name: 'Done', value: 'Done' },
			]);
			expect(mockNotionApiRequest).toHaveBeenNthCalledWith(1, 'GET', requestPath`/pages/${pageId}`);
			expect(mockNotionApiRequest).toHaveBeenNthCalledWith(
				2,
				'GET',
				requestPath`/databases/database-123`,
			);
		});

		it.each([
			['incomplete url resourceLocator object', { __rl: true, mode: 'url' }],
			['incomplete id resourceLocator object', { __rl: true, mode: 'id' }],
			['null value', null],
			['numeric value', 12345],
			['empty string', ''],
		])('returns no options when pageId resolves to %s', async (_label, pageId) => {
			const context = createNotionV2LoadOptionsContext(
				{
					resource: 'databasePage',
					operation: 'update',
					pageId,
					propertiesUi: {
						propertyValues: [{ key: 'Status|select', type: 'select' }],
					},
				},
				'parameters.propertiesUi.propertyValues[0].selectValue',
			);

			const result = await getDatabaseOptionsFromPage.call(context);

			expect(result).toEqual([]);
			expect(mockNotionApiRequest).not.toHaveBeenCalled();
		});
	});
});
