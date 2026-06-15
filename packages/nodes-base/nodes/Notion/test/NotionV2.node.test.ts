import get from 'lodash/get';
import type {
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	IPairedItemData,
} from 'n8n-workflow';

import * as GenericFunctions from '../shared/GenericFunctions';
import { NotionV2 } from '../v2/NotionV2.node';

jest.mock('../shared/GenericFunctions', () => ({
	...jest.requireActual<typeof GenericFunctions>('../shared/GenericFunctions'),
	notionApiRequestAllItems: jest.fn(),
}));

const mockNotionApiRequestAllItems = GenericFunctions.notionApiRequestAllItems as jest.Mock;

function createMockExecuteFunction(nodeParameters: IDataObject): IExecuteFunctions {
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
				typeVersion: 2.2,
				name: 'Notion',
				type: 'n8n-nodes-base.notion',
			}) as unknown as INode,
		getTimezone: () => 'UTC',
		continueOnFail: () => false,
		helpers: {
			constructExecutionMetaData: (
				inputData: INodeExecutionData[],
				_options: { itemData: IPairedItemData | IPairedItemData[] },
			) => inputData,
			returnJsonArray: (data: IDataObject | IDataObject[]) =>
				(Array.isArray(data) ? data : [data]).map((d) => ({ json: d })),
		},
	} as unknown as IExecuteFunctions;
}

const node = new NotionV2({
	name: 'notion',
	displayName: 'Notion',
	icon: 'file:notion.svg',
	group: ['output'],
	defaultVersion: 2.2,
	description: 'Consume Notion API',
});

describe('NotionV2 getAll pagination (coverage)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('block getAll: should paginate with limit and slice results', async () => {
		const mockData = Array.from({ length: 150 }, (_, i) => ({
			object: 'block',
			id: `block-${i}`,
		}));
		mockNotionApiRequestAllItems.mockResolvedValueOnce(mockData);

		const context = createMockExecuteFunction({
			resource: 'block',
			operation: 'getAll',
			'blockId.value': 'test-block-id',
			blockId: { __rl: true, mode: 'id', value: 'test-block-id' },
			returnAll: false,
			limit: 150,
			fetchNestedBlocks: false,
		});

		const result = await node.execute.call(context);

		expect(mockNotionApiRequestAllItems).toHaveBeenCalledWith(
			'results',
			'GET',
			'/blocks/test-block-id/children',
			{},
			{ page_size: 100, limit: 150 },
		);
		expect(result[0]).toHaveLength(150);
	});

	it('database getAll: should paginate with limit and slice results', async () => {
		const mockData = Array.from({ length: 150 }, (_, i) => ({
			object: 'database',
			id: `db-${i}`,
		}));
		mockNotionApiRequestAllItems.mockResolvedValueOnce(mockData);

		const context = createMockExecuteFunction({
			resource: 'database',
			operation: 'getAll',
			returnAll: false,
			limit: 150,
			simple: false,
		});

		const result = await node.execute.call(context);

		expect(mockNotionApiRequestAllItems).toHaveBeenCalledWith(
			'results',
			'POST',
			'/search',
			expect.objectContaining({
				filter: { property: 'object', value: 'database' },
				page_size: 100,
			}),
			{ limit: 150 },
		);
		expect(result[0]).toHaveLength(150);
	});

	it('databasePage getAll: should paginate with limit and slice results', async () => {
		const mockData = Array.from({ length: 150 }, (_, i) => ({
			object: 'page',
			id: `page-${i}`,
		}));
		mockNotionApiRequestAllItems.mockResolvedValueOnce(mockData);

		const context = createMockExecuteFunction({
			resource: 'databasePage',
			operation: 'getAll',
			'databaseId.value': 'test-db-id',
			databaseId: { __rl: true, mode: 'id', value: 'test-db-id' },
			returnAll: false,
			limit: 150,
			simple: false,
			filterType: 'none',
			'options.downloadFiles': false,
			'filters.conditions': [],
			'options.sort.sortValue': [],
			'options.filter': {},
		});

		const result = await node.execute.call(context);

		expect(mockNotionApiRequestAllItems).toHaveBeenCalledWith(
			'results',
			'POST',
			'/databases/test-db-id/query',
			expect.objectContaining({ page_size: 100 }),
			{ limit: 150 },
		);
		expect(result[0]).toHaveLength(150);
	});
});
