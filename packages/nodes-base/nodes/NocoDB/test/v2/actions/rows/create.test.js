import { execute } from '../../../../v2/actions/rows/create.operation';
import { apiRequest, apiRequestAllItems } from '../../../../v2/transport';
vi.mock('../../../../v2/transport/index', async () => {
    const originalModule = await vi.importActual('../../../../v2/transport/index');
    return {
        ...originalModule,
        apiRequest: { call: vi.fn() },
        apiRequestAllItems: { call: vi.fn() },
    };
});
describe('NocoDB Rows Create Action', () => {
    let mockExecuteFunctions;
    beforeEach(() => {
        mockExecuteFunctions = {
            getNodeParameter: vi.fn(),
            getInputData: vi.fn(() => [{ json: {} }]),
            continueOnFail: vi.fn(() => false),
            helpers: {
                returnJsonArray: vi.fn((data) => (Array.isArray(data) ? data : [data])),
                constructExecutionMetaData: vi.fn((items) => items),
            },
            getNode: vi.fn(() => { }),
        };
        apiRequest.call.mockClear();
        apiRequestAllItems.call.mockClear();
    });
    it('should create a row with autoMapInputData', async () => {
        const mockBase = 'base1';
        const mockTable = 'table1';
        const mockColumnsToInsert = {
            column1: 'value1',
            column2: 'value2',
        };
        const mockResponseData = {
            id: 1,
            fields: mockColumnsToInsert,
        };
        mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
            if (paramName === 'projectId')
                return mockBase;
            if (paramName === 'table')
                return mockTable;
            if (paramName === 'dataToSend')
                return 'autoMapInputData';
            if (paramName === 'inputsToIgnore')
                return '';
            return undefined;
        });
        mockExecuteFunctions.getInputData.mockReturnValue([
            {
                json: {
                    fields: mockColumnsToInsert,
                },
            },
        ]);
        apiRequest.call.mockResolvedValue({ records: [mockResponseData] });
        const result = await execute.call(mockExecuteFunctions);
        expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('projectId', 0, undefined, expect.anything());
        expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('table', 0, undefined, expect.anything());
        expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('dataToSend', 0);
        expect(apiRequest.call).toHaveBeenCalledWith(expect.anything(), 'POST', `/api/v3/data/${mockBase}/${mockTable}/records`, [
            {
                fields: mockColumnsToInsert,
            },
        ], {});
        expect(result).toEqual([[mockResponseData]]);
    });
    it('should create a row with defineBelow and fieldsMapper', async () => {
        const mockBase = 'base1';
        const mockTable = 'table1';
        const mockFieldsMapper = {
            schema: [{ id: 'Title' }],
            value: {
                Title: 'Hello world',
            },
        };
        const mockColumnsToInsert = {
            Title: 'Hello world',
        };
        const mockResponseData = {
            id: 1,
            fields: mockColumnsToInsert,
        };
        mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
            if (paramName === 'projectId')
                return mockBase;
            if (paramName === 'table')
                return mockTable;
            if (paramName === 'dataToSend')
                return 'defineBelow';
            if (paramName === 'fieldsMapper')
                return mockFieldsMapper;
            return undefined;
        });
        mockExecuteFunctions.getInputData.mockReturnValue([
            {
                json: {},
            },
        ]);
        mockExecuteFunctions.helpers.returnJsonArray.mockImplementation((data) => data);
        apiRequest.call.mockResolvedValue({ records: [mockResponseData] });
        const result = await execute.call(mockExecuteFunctions);
        expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('projectId', 0, undefined, expect.anything());
        expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('table', 0, undefined, expect.anything());
        expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('dataToSend', 0);
        expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('fieldsMapper', 0, expect.anything());
        expect(apiRequest.call).toHaveBeenCalledWith(expect.anything(), 'POST', `/api/v3/data/${mockBase}/${mockTable}/records`, [
            {
                fields: mockColumnsToInsert,
            },
        ], {});
        expect(result).toEqual([[mockResponseData]]);
    });
});
//# sourceMappingURL=create.test.js.map