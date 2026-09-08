import get from 'lodash/get';
import * as GenericFunctions from '../shared/GenericFunctions';
import { NotionV2 } from '../v2/NotionV2.node';
vi.mock('../shared/GenericFunctions', async () => ({
    ...(await vi.importActual('../shared/GenericFunctions')),
    notionApiRequestAllItems: vi.fn(),
}));
const mockNotionApiRequestAllItems = GenericFunctions.notionApiRequestAllItems;
function createMockExecuteFunction(nodeParameters) {
    return {
        getInputData: () => [{ json: {} }],
        getNodeParameter(parameterName, _itemIndex, fallbackValue, options) {
            const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
            return get(nodeParameters, parameter, fallbackValue);
        },
        getNode: () => ({
            typeVersion: 2.2,
            name: 'Notion',
            type: 'n8n-nodes-base.notion',
        }),
        getTimezone: () => 'UTC',
        continueOnFail: () => false,
        helpers: {
            constructExecutionMetaData: (inputData, _options) => inputData,
            returnJsonArray: (data) => (Array.isArray(data) ? data : [data]).map((d) => ({ json: d })),
        },
    };
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
        vi.clearAllMocks();
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
        expect(mockNotionApiRequestAllItems).toHaveBeenCalledWith('results', 'GET', '/blocks/test-block-id/children', {}, { page_size: 100, limit: 150 });
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
        expect(mockNotionApiRequestAllItems).toHaveBeenCalledWith('results', 'POST', '/search', expect.objectContaining({
            filter: { property: 'object', value: 'database' },
            page_size: 100,
        }), { limit: 150 });
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
        expect(mockNotionApiRequestAllItems).toHaveBeenCalledWith('results', 'POST', '/databases/test-db-id/query', expect.objectContaining({ page_size: 100 }), { limit: 150 });
        expect(result[0]).toHaveLength(150);
    });
});
//# sourceMappingURL=NotionV2.node.test.js.map