import get from 'lodash/get';
import type {
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IPairedItemData,
} from 'n8n-workflow';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as GenericFunctions from '../shared/GenericFunctions';
import { NotionV3 } from '../v3/NotionV3.node';
import * as Transport from '../v3/transport';

vi.mock('../shared/GenericFunctions', async () => ({
	...(await vi.importActual<typeof GenericFunctions>('../shared/GenericFunctions')),
	downloadFiles: vi.fn(),
}));

vi.mock('../v3/transport', async () => ({
	...(await vi.importActual<typeof Transport>('../v3/transport')),
	getDataSourceProperties: vi.fn(),
	notionApiRequestV3: vi.fn(),
	notionApiRequestAllItemsV3: vi.fn(),
	resolveDataSourceId: vi.fn(),
}));

const mockDownloadFiles = GenericFunctions.downloadFiles as Mock;
const mockGetDataSourceProperties = Transport.getDataSourceProperties as Mock;
const mockNotionApiRequest = Transport.notionApiRequestV3 as Mock;
const mockNotionApiRequestAllItems = Transport.notionApiRequestAllItemsV3 as Mock;
const mockResolveDataSourceId = Transport.resolveDataSourceId as Mock;

function createMockExecuteFunction(
	nodeParameters: IDataObject,
	options: { continueOnFail?: boolean } = {},
): IExecuteFunctions {
	return {
		getInputData: () => [{ json: {} }],
		getNodeParameter(
			parameterName: string,
			_itemIndex: number,
			fallbackValue?: unknown,
			options?: IGetNodeParameterOptions,
		) {
			const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
			return get(nodeParameters, parameter, fallbackValue);
		},
		getNode: () =>
			({
				typeVersion: 3,
				name: 'Notion',
				type: 'n8n-nodes-base.notion',
			}) as INode,
		getTimezone: () => 'UTC',
		continueOnFail: () => options.continueOnFail ?? false,
		helpers: {
			constructExecutionMetaData: (
				inputData: INodeExecutionData[],
				_options: { itemData: IPairedItemData | IPairedItemData[] },
			) => inputData,
			returnJsonArray: (data: IDataObject | IDataObject[]) =>
				(Array.isArray(data) ? data : [data]).map((d) => ({ json: d })),
		},
	} as IExecuteFunctions;
}

const node = new NotionV3({
	name: 'notion',
	displayName: 'Notion',
	icon: 'file:notion.svg',
	group: ['output'],
	defaultVersion: 3,
	description: 'Consume Notion API',
});

describe('NotionV3', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates database pages with a data source parent', async () => {
		mockGetDataSourceProperties.mockResolvedValueOnce({
			Name: { type: 'title' },
		});
		mockResolveDataSourceId.mockReturnValueOnce('data-source-id');
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'page', id: 'page-id' });

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'create',
			'dataSourceId.value': 'data-source-id',
			dataSourceId: { __rl: true, mode: 'id', value: 'data-source-id' },
			title: 'New page',
			simple: false,
			'propertiesUi.propertyValues': [],
			contentType: 'json',
			blocksJson: '[{"object":"block","type":"paragraph","paragraph":{"rich_text":[]}}]',
			options: {
				iconType: 'emoji',
				icon: '🔥',
			},
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'POST',
			'/pages',
			expect.objectContaining({
				parent: { type: 'data_source_id', data_source_id: 'data-source-id' },
				children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } }],
				icon: { type: 'emoji', emoji: '🔥' },
			}),
		);
	});

	it('appends blocks after a specific block', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'list', results: [] });

		const context = createMockExecuteFunction({
			resource: 'block',
			operation: 'append',
			blockId: { __rl: true, mode: 'id', value: 'parent-block-id' },
			afterBlockId: 'after-block-id',
			'blockUi.blockValues': [
				{
					type: 'paragraph',
					richText: false,
					textContent: 'Hello',
				},
			],
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/blocks/parent-block-id/children',
			expect.objectContaining({
				position: {
					type: 'after_block',
					after_block: { id: 'after-block-id' },
				},
				children: [
					expect.objectContaining({
						type: 'paragraph',
					}),
				],
			}),
		);
	});

	it('formats shared rich text block values for v3 block append requests', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'list', results: [] });

		const context = createMockExecuteFunction({
			resource: 'block',
			operation: 'append',
			blockId: { __rl: true, mode: 'id', value: 'parent-block-id' },
			afterBlockId: '',
			'blockUi.blockValues': [
				{
					type: 'paragraph',
					richText: true,
					text: {
						text: [
							{
								textType: 'text',
								text: 'Linked text',
								isLink: true,
								textLink: 'https://example.com',
								annotationUi: { bold: true },
							},
							{
								textType: 'mention',
								mentionType: 'database',
								database: {
									__rl: true,
									mode: 'id',
									value: 'database-id',
								},
							},
							{
								textType: 'equation',
								expression: 'x = 1',
							},
						],
					},
				},
			],
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/blocks/parent-block-id/children',
			expect.objectContaining({
				children: [
					{
						object: 'block',
						type: 'paragraph',
						paragraph: {
							rich_text: [
								{
									type: 'text',
									text: {
										content: 'Linked text',
										link: { url: 'https://example.com' },
									},
									annotations: { bold: true },
								},
								{
									type: 'mention',
									mention: {
										type: 'database',
										database: { id: 'database-id' },
									},
								},
								{
									type: 'equation',
									equation: { expression: 'x = 1' },
								},
							],
						},
					},
				],
			}),
		);
	});

	it('gets block markdown through the page markdown endpoint', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({
			object: 'page_markdown',
			id: 'block-id',
			markdown: '## Nested content',
		});

		const context = createMockExecuteFunction({
			resource: 'block',
			operation: 'getMarkdown',
			blockId: { __rl: true, mode: 'id', value: 'block-id' },
			includeTranscript: true,
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'GET',
			'/pages/block-id/markdown',
			{},
			{ include_transcript: true },
		);
	});

	it('extracts block IDs from notion.com block URL hashes', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({
			object: 'page_markdown',
			id: '550e8400e29b41d4a716446655440000',
			markdown: '## Nested content',
		});

		const context = createMockExecuteFunction({
			resource: 'block',
			operation: 'getMarkdown',
			blockId: {
				__rl: true,
				mode: 'url',
				value:
					'https://www.notion.com/Block-Test-88888ccc303e4f44847f27d24bd7ad8e?pvs=4#550e8400e29b41d4a716446655440000',
			},
			includeTranscript: false,
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'GET',
			'/pages/550e8400e29b41d4a716446655440000/markdown',
			{},
			{},
		);
	});

	it('returns item errors when continue on fail is enabled', async () => {
		mockNotionApiRequest.mockRejectedValueOnce(new Error('Notion request failed'));

		const context = createMockExecuteFunction(
			{
				resource: 'block',
				operation: 'getMarkdown',
				blockId: { __rl: true, mode: 'id', value: 'block-id' },
				includeTranscript: false,
			},
			{ continueOnFail: true },
		);

		const result = await node.execute.call(context);

		expect(result[0]).toEqual([
			{
				json: { error: 'Notion request failed' },
				pairedItem: { item: 0 },
			},
		]);
	});

	it('creates pages with file icons', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'page', id: 'page-id' });

		const context = createMockExecuteFunction({
			resource: 'page',
			operation: 'create',
			pageId: { __rl: true, mode: 'id', value: 'parent-page-id' },
			title: 'New page',
			contentType: 'markdown',
			markdown: '# Content',
			simple: false,
			options: {
				iconType: 'file',
				icon: 'https://example.com/icon.png',
			},
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'POST',
			'/pages',
			expect.objectContaining({
				parent: { page_id: 'parent-page-id' },
				markdown: '# Content',
				icon: { type: 'external', external: { url: 'https://example.com/icon.png' } },
			}),
		);
	});

	it('updates page markdown', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'page_markdown', id: 'page-id' });

		const context = createMockExecuteFunction({
			resource: 'page',
			operation: 'updateMarkdown',
			pageId: { __rl: true, mode: 'id', value: 'page-id' },
			markdownUpdateType: 'replace_content',
			markdown: '# New content',
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith('PATCH', '/pages/page-id/markdown', {
			type: 'replace_content',
			replace_content: { new_str: '# New content' },
		});
	});

	it('extracts page IDs from full URLs with page query parameters', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'page_markdown', id: 'page-id' });

		const context = createMockExecuteFunction({
			resource: 'page',
			operation: 'updateMarkdown',
			pageId: {
				__rl: true,
				mode: 'url',
				value:
					'https://www.notion.com/0fe2f7de558b471eab07e9d871cdf4a9?v=f2d424ba0c404733a3f500c78c881610&p=550e8400e29b41d4a716446655440000&pm=s',
			},
			markdownUpdateType: 'replace_content',
			markdown: '# New content',
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/pages/550e8400e29b41d4a716446655440000/markdown',
			{
				type: 'replace_content',
				replace_content: { new_str: '# New content' },
			},
		);
	});

	it('updates page markdown with content updates', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'page_markdown', id: 'page-id' });

		const context = createMockExecuteFunction({
			resource: 'page',
			operation: 'updateMarkdown',
			pageId: { __rl: true, mode: 'id', value: 'page-id' },
			markdownUpdateType: 'update_content',
			'contentUpdates.updates': [
				{
					oldString: 'Old text',
					newString: 'New text',
					replaceAllMatches: true,
				},
			],
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith('PATCH', '/pages/page-id/markdown', {
			type: 'update_content',
			update_content: {
				content_updates: [
					{
						old_str: 'Old text',
						new_str: 'New text',
						replace_all_matches: true,
					},
				],
			},
		});
	});

	it('maps status properties from statusValue', async () => {
		mockGetDataSourceProperties.mockResolvedValueOnce({
			Name: { type: 'title' },
			Status: { type: 'status' },
		});
		mockResolveDataSourceId.mockReturnValueOnce('data-source-id');
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'page', id: 'page-id' });

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'create',
			'dataSourceId.value': 'data-source-id',
			dataSourceId: { __rl: true, mode: 'id', value: 'data-source-id' },
			title: 'New page',
			simple: false,
			'propertiesUi.propertyValues': [
				{
					key: 'Status|status',
					statusValue: 'In progress',
				},
			],
			contentType: 'json',
			blocksJson: '[]',
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'POST',
			'/pages',
			expect.objectContaining({
				properties: expect.objectContaining({
					Status: {
						type: 'status',
						status: { name: 'In progress' },
					},
				}),
			}),
		);
	});

	it('maps rich text properties from textContent', async () => {
		mockGetDataSourceProperties.mockResolvedValueOnce({
			Name: { type: 'title' },
			Notes: { type: 'rich_text' },
		});
		mockResolveDataSourceId.mockReturnValueOnce('data-source-id');
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'page', id: 'page-id' });

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'create',
			'dataSourceId.value': 'data-source-id',
			dataSourceId: { __rl: true, mode: 'id', value: 'data-source-id' },
			title: 'New page',
			simple: false,
			'propertiesUi.propertyValues': [
				{
					key: 'Notes|rich_text',
					textContent: 'Plain rich text',
				},
			],
			contentType: 'json',
			blocksJson: '[]',
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'POST',
			'/pages',
			expect.objectContaining({
				properties: expect.objectContaining({
					Notes: {
						rich_text: [{ text: { content: 'Plain rich text' } }],
					},
				}),
			}),
		);
	});

	it('maps date properties from date fields', async () => {
		mockGetDataSourceProperties.mockResolvedValueOnce({
			Name: { type: 'title' },
			Due: { type: 'date' },
		});
		mockResolveDataSourceId.mockReturnValueOnce('data-source-id');
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'page', id: 'page-id' });

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'create',
			'dataSourceId.value': 'data-source-id',
			dataSourceId: { __rl: true, mode: 'id', value: 'data-source-id' },
			title: 'New page',
			simple: false,
			'propertiesUi.propertyValues': [
				{
					key: 'Due|date',
					range: false,
					includeTime: false,
					date: '2026-07-07T10:00:00.000Z',
					timezone: 'default',
				},
			],
			contentType: 'json',
			blocksJson: '[]',
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'POST',
			'/pages',
			expect.objectContaining({
				properties: expect.objectContaining({
					Due: {
						type: 'date',
						date: {
							start: '2026-07-07',
							end: null,
						},
					},
				}),
			}),
		);
	});

	it('maps date range properties from date range fields', async () => {
		mockGetDataSourceProperties.mockResolvedValueOnce({
			Name: { type: 'title' },
			Due: { type: 'date' },
		});
		mockResolveDataSourceId.mockReturnValueOnce('data-source-id');
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'page', id: 'page-id' });

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'create',
			'dataSourceId.value': 'data-source-id',
			dataSourceId: { __rl: true, mode: 'id', value: 'data-source-id' },
			title: 'New page',
			simple: false,
			'propertiesUi.propertyValues': [
				{
					key: 'Due|date',
					range: true,
					includeTime: false,
					dateStart: '2026-07-07T10:00:00.000Z',
					dateEnd: '2026-07-08T10:00:00.000Z',
					timezone: 'default',
				},
			],
			contentType: 'json',
			blocksJson: '[]',
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'POST',
			'/pages',
			expect.objectContaining({
				properties: expect.objectContaining({
					Due: {
						type: 'date',
						date: {
							start: '2026-07-07',
							end: '2026-07-08',
						},
					},
				}),
			}),
		);
	});

	it('updates database page date properties', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'page', id: 'page-id' });

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'update',
			pageId: { __rl: true, mode: 'id', value: 'page-id' },
			simple: false,
			options: {
				iconType: 'file',
				icon: 'https://example.com/icon.png',
			},
			'propertiesUi.propertyValues': [
				{
					key: 'Due|date',
					date: '2026-07-07T10:00:00.000Z',
				},
			],
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/pages/page-id',
			expect.objectContaining({
				properties: {
					Due: {
						type: 'date',
						date: {
							start: '2026-07-07T10:00:00Z',
							end: null,
						},
					},
				},
				icon: { type: 'external', external: { url: 'https://example.com/icon.png' } },
			}),
		);
	});

	it('updates database page date range properties', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'page', id: 'page-id' });

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'update',
			pageId: { __rl: true, mode: 'id', value: 'page-id' },
			simple: false,
			'propertiesUi.propertyValues': [
				{
					key: 'Due|date',
					range: true,
					dateStart: '2026-07-05T00:00:00',
					dateEnd: '2026-07-11T00:00:00',
				},
			],
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/pages/page-id',
			expect.objectContaining({
				properties: {
					Due: {
						type: 'date',
						date: {
							start: '2026-07-05T00:00:00Z',
							end: '2026-07-11T00:00:00Z',
						},
					},
				},
			}),
		);
	});

	it('maps people, relation, files, and empty URL properties', async () => {
		mockGetDataSourceProperties.mockResolvedValueOnce({
			Name: { type: 'title' },
			Assignee: { type: 'people' },
			Related: { type: 'relation' },
			Files: { type: 'files' },
			Website: { type: 'url' },
		});
		mockResolveDataSourceId.mockReturnValueOnce('data-source-id');
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'page', id: 'page-id' });

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'create',
			'dataSourceId.value': 'data-source-id',
			dataSourceId: { __rl: true, mode: 'id', value: 'data-source-id' },
			title: 'New page',
			simple: false,
			'propertiesUi.propertyValues': [
				{
					key: 'Assignee|people',
					peopleValue: ['user-id-1', 'user-id-2'],
				},
				{
					key: 'Related|relation',
					relationValue: [
						'550e8400-e29b-41d4-a716-446655440000',
						'6fa459ea-ee8a-3ca4-894e-db77e160355e',
					],
				},
				{
					key: 'Files|files',
					fileUrls: {
						fileUrl: [
							{
								name: 'Spec',
								url: 'https://example.com/spec.pdf',
							},
						],
					},
				},
				{
					key: 'Website|url',
					urlValue: '',
					ignoreIfEmpty: true,
				},
			],
			contentType: 'json',
			blocksJson: '[]',
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith(
			'POST',
			'/pages',
			expect.objectContaining({
				properties: expect.objectContaining({
					Assignee: {
						type: 'people',
						people: [{ id: 'user-id-1' }, { id: 'user-id-2' }],
					},
					Related: {
						type: 'relation',
						relation: [
							{ id: '550e8400-e29b-41d4-a716-446655440000' },
							{ id: '6fa459ea-ee8a-3ca4-894e-db77e160355e' },
						],
					},
					Files: {
						type: 'files',
						files: [
							{
								name: 'Spec',
								type: 'external',
								external: { url: 'https://example.com/spec.pdf' },
							},
						],
					},
				}),
			}),
		);
		expect(mockNotionApiRequest.mock.calls[0][2].properties).not.toHaveProperty('Website');
	});

	it('fetches nested blocks when requested', async () => {
		mockNotionApiRequestAllItems
			.mockResolvedValueOnce([
				{
					object: 'block',
					id: 'child-block-id',
					type: 'paragraph',
					has_children: true,
				},
			])
			.mockResolvedValueOnce([
				{
					object: 'block',
					id: 'nested-block-id',
					type: 'paragraph',
					has_children: false,
				},
			]);

		const context = createMockExecuteFunction({
			resource: 'block',
			operation: 'getAll',
			blockId: { __rl: true, mode: 'id', value: 'parent-block-id' },
			returnAll: true,
			fetchNestedBlocks: true,
			simplifyOutput: false,
		});

		const result = await node.execute.call(context);

		expect(mockNotionApiRequestAllItems).toHaveBeenCalledWith(
			'results',
			'GET',
			'/blocks/parent-block-id/children',
			{},
			{},
		);
		expect(mockNotionApiRequestAllItems).toHaveBeenCalledWith(
			'results',
			'GET',
			'/blocks/child-block-id/children',
		);
		expect(result[0].map((item) => item.json.id)).toEqual(['child-block-id', 'nested-block-id']);
	});

	it('queries data source pages with structured filters and sorting', async () => {
		mockResolveDataSourceId.mockReturnValueOnce('data-source-id');
		mockNotionApiRequestAllItems.mockResolvedValueOnce([]);

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'getAll',
			'dataSourceId.value': 'data-source-id',
			dataSourceId: { __rl: true, mode: 'id', value: 'data-source-id' },
			returnAll: false,
			limit: 10,
			filterType: 'manual',
			matchType: 'allFilters',
			'filters.conditions': [
				{
					key: 'Name|title',
					type: 'title',
					condition: 'contains',
					richTextValue: 'Roadmap',
				},
			],
			options: {
				sort: {
					sortValue: [
						{
							timestamp: false,
							key: 'Due|date',
							direction: 'descending',
						},
					],
				},
			},
			simple: false,
		});

		await node.execute.call(context);

		expect(mockNotionApiRequestAllItems).toHaveBeenCalledWith(
			'results',
			'POST',
			'/data_sources/data-source-id/query',
			{
				filter: {
					and: [
						{
							property: 'Name',
							rich_text: { contains: 'Roadmap' },
						},
					],
				},
				sorts: [
					{
						direction: 'descending',
						property: 'Due',
					},
				],
				page_size: 10,
			},
			{ limit: 10 },
		);
	});

	it('queries data source pages with timestamp filter syntax', async () => {
		mockResolveDataSourceId.mockReturnValueOnce('data-source-id');
		mockNotionApiRequestAllItems.mockResolvedValueOnce([]);

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'getAll',
			'dataSourceId.value': 'data-source-id',
			dataSourceId: { __rl: true, mode: 'id', value: 'data-source-id' },
			returnAll: true,
			filterType: 'manual',
			matchType: 'anyFilter',
			'filters.conditions': [
				{
					key: 'Created Time|created_time',
					type: 'created_time',
					condition: 'this_week',
				},
			],
			options: {
				sort: {
					sortValue: [],
				},
			},
			simple: false,
		});

		await node.execute.call(context);

		expect(mockNotionApiRequestAllItems).toHaveBeenCalledWith(
			'results',
			'POST',
			'/data_sources/data-source-id/query',
			{
				filter: {
					or: [
						{
							timestamp: 'created_time',
							created_time: { this_week: {} },
						},
					],
				},
			},
			{},
		);
	});

	it('downloads files from data source page results when requested', async () => {
		const page = {
			object: 'page',
			id: 'page-id',
			properties: {
				Files: {
					type: 'files',
					files: [{ external: { url: 'https://example.com/file.pdf' } }],
				},
			},
		};
		mockResolveDataSourceId.mockReturnValueOnce('data-source-id');
		mockNotionApiRequestAllItems.mockResolvedValueOnce([page]);
		mockDownloadFiles.mockResolvedValueOnce([{ json: page, binary: { file: {} } }]);

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'getAll',
			'dataSourceId.value': 'data-source-id',
			dataSourceId: { __rl: true, mode: 'id', value: 'data-source-id' },
			returnAll: true,
			filterType: 'none',
			options: {
				sort: {
					sortValue: [],
				},
				downloadFiles: true,
			},
			simple: false,
		});

		const result = await node.execute.call(context);

		expect(mockDownloadFiles).toHaveBeenCalledWith([page], [{ item: 0 }]);
		expect(result[0]).toEqual([{ json: page, binary: { file: {} } }]);
	});

	it('downloads files from a single database page when requested', async () => {
		const page = {
			object: 'page',
			id: 'page-id',
			properties: {
				Files: {
					type: 'files',
					files: [{ external: { url: 'https://example.com/file.pdf' } }],
				},
			},
		};
		mockNotionApiRequest.mockResolvedValueOnce(page);
		mockDownloadFiles.mockResolvedValueOnce([{ json: page, binary: { file: {} } }]);

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'get',
			pageId: { __rl: true, mode: 'id', value: 'page-id' },
			options: {
				downloadFiles: true,
			},
			simple: false,
		});

		const result = await node.execute.call(context);

		expect(mockDownloadFiles).toHaveBeenCalledWith([page], [{ item: 0 }]);
		expect(result[0]).toEqual([{ json: page, binary: { file: {} } }]);
	});

	it('keeps URLs when simplifying data source pages', async () => {
		mockResolveDataSourceId.mockReturnValueOnce('data-source-id');
		mockNotionApiRequestAllItems.mockResolvedValueOnce([
			{
				object: 'page',
				id: 'page-id',
				url: 'https://www.notion.com/Page-pageid',
				properties: {
					Name: {
						type: 'title',
						title: [{ type: 'text', plain_text: 'Roadmap' }],
					},
				},
			},
		]);

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'getAll',
			'dataSourceId.value': 'data-source-id',
			dataSourceId: { __rl: true, mode: 'id', value: 'data-source-id' },
			returnAll: true,
			filterType: 'none',
			options: {
				sort: {
					sortValue: [],
				},
			},
			simple: true,
		});

		const result = await node.execute.call(context);

		expect(result[0][0].json).toEqual({
			id: 'page-id',
			name: 'Roadmap',
			url: 'https://www.notion.com/Page-pageid',
			property_name: 'Roadmap',
		});
	});

	it('searches pages with sort options', async () => {
		mockNotionApiRequestAllItems.mockResolvedValueOnce([]);

		const context = createMockExecuteFunction({
			resource: 'page',
			operation: 'search',
			text: 'Roadmap',
			returnAll: false,
			limit: 10,
			options: {
				sort: {
					sortValue: {
						timestamp: 'last_edited_time',
						direction: 'ascending',
					},
				},
			},
			simple: false,
		});

		await node.execute.call(context);

		expect(mockNotionApiRequestAllItems).toHaveBeenCalledWith(
			'results',
			'POST',
			'/search',
			expect.objectContaining({
				query: 'Roadmap',
				filter: { property: 'object', value: 'page' },
				sort: { timestamp: 'last_edited_time', direction: 'ascending' },
				page_size: 10,
			}),
			{ limit: 10 },
		);
	});

	it('appends text-bearing block-builder blocks from textContent', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'list', results: [] });

		const context = createMockExecuteFunction({
			resource: 'block',
			operation: 'append',
			blockId: { __rl: true, mode: 'id', value: 'parent-block-id' },
			afterBlockId: '',
			'blockUi.blockValues': [
				{
					type: 'paragraph',
					textContent: 'Paragraph text',
				},
				{
					type: 'heading_1',
					textContent: 'Heading text',
				},
				{
					type: 'to_do',
					textContent: 'Task text',
					checked: true,
				},
				{
					type: 'child_page',
					title: 'Nested child page',
				},
			],
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith('PATCH', '/blocks/parent-block-id/children', {
			children: [
				expect.objectContaining({
					type: 'paragraph',
					paragraph: { rich_text: [{ text: { content: 'Paragraph text' } }] },
				}),
				expect.objectContaining({
					type: 'heading_1',
					heading_1: { rich_text: [{ text: { content: 'Heading text' } }] },
				}),
				expect.objectContaining({
					type: 'to_do',
					to_do: {
						checked: true,
						rich_text: [{ text: { content: 'Task text' } }],
					},
				}),
				expect.objectContaining({
					type: 'child_page',
					child_page: { title: 'Nested child page' },
				}),
			],
		});
	});

	it('gets a data source directly', async () => {
		mockResolveDataSourceId.mockReturnValueOnce('data-source-id');
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'data_source', id: 'data-source-id' });

		const context = createMockExecuteFunction({
			resource: 'dataSource',
			operation: 'get',
			'dataSourceId.value': 'data-source-id',
			dataSourceId: { __rl: true, mode: 'id', value: 'data-source-id' },
		});

		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith('GET', '/data_sources/data-source-id');
	});

	it('simplifies a data source get response', async () => {
		mockResolveDataSourceId.mockReturnValueOnce('data-source-id');
		mockNotionApiRequest.mockResolvedValueOnce({
			object: 'data_source',
			id: 'data-source-id',
			name: 'Tasks',
			url: 'https://notion.so/data-source-id',
			properties: { Name: { type: 'title' } },
		});

		const context = createMockExecuteFunction({
			resource: 'dataSource',
			operation: 'get',
			'dataSourceId.value': 'data-source-id',
			dataSourceId: { __rl: true, mode: 'id', value: 'data-source-id' },
			simple: true,
		});

		const result = await node.execute.call(context);

		expect(result[0][0].json).toEqual({
			id: 'data-source-id',
			name: 'Tasks',
			url: 'https://notion.so/data-source-id',
		});
	});

	it('searches data sources from database search results', async () => {
		mockNotionApiRequestAllItems.mockResolvedValueOnce([
			{
				object: 'data_source',
				id: 'data-source-id',
				url: 'https://notion.so/database-id',
				title: [{ plain_text: 'Tasks' }],
				parent: { type: 'database_id', database_id: 'database-id' },
			},
		]);

		const context = createMockExecuteFunction({
			resource: 'dataSource',
			operation: 'search',
			text: 'Tasks',
			returnAll: false,
			limit: 10,
			options: {
				sort: {
					sortValue: {
						timestamp: 'last_edited_time',
						direction: 'descending',
					},
				},
			},
		});

		const result = await node.execute.call(context);

		expect(mockNotionApiRequestAllItems).toHaveBeenCalledWith(
			'results',
			'POST',
			'/search',
			expect.objectContaining({
				filter: { property: 'object', value: 'data_source' },
				query: 'Tasks',
				sort: { timestamp: 'last_edited_time', direction: 'descending' },
				page_size: 10,
			}),
			{ limit: 10 },
		);
		expect(result[0][0].json).toEqual({
			object: 'data_source',
			id: 'data-source-id',
			url: 'https://notion.so/database-id',
			title: [{ plain_text: 'Tasks' }],
			parent: { type: 'database_id', database_id: 'database-id' },
		});
	});

	it('simplifies data source search results', async () => {
		mockNotionApiRequestAllItems.mockResolvedValueOnce([
			{
				object: 'data_source',
				id: 'data-source-id',
				name: 'Tasks',
				url: 'https://notion.so/data-source-id',
				parent: { type: 'database_id', database_id: 'database-id' },
			},
		]);

		const context = createMockExecuteFunction({
			resource: 'dataSource',
			operation: 'search',
			text: 'Tasks',
			returnAll: true,
			simple: true,
		});

		const result = await node.execute.call(context);

		expect(result[0][0].json).toEqual({
			id: 'data-source-id',
			name: 'Tasks',
			url: 'https://notion.so/data-source-id',
		});
	});
});
