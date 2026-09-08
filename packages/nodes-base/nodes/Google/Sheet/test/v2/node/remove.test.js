import { execute } from '../../../v2/actions/sheet/remove.operation';
import { apiRequest } from '../../../v2/transport';
vi.mock('../../../v2/transport', () => ({
    apiRequest: vi.fn(),
}));
describe('Google Sheet - Remove', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    const mockExecuteFunctions = {
        getInputData: vi.fn(),
        getNodeParameter: vi.fn(),
        helpers: {
            constructExecutionMetaData: vi.fn(),
        },
    };
    const sheet = {};
    const sheetName = 'spreadsheet123||sheet456';
    test('should process a single item', async () => {
        const items = [{ json: {} }];
        mockExecuteFunctions.getInputData.mockReturnValue(items);
        const apiResponse = { replies: [{ some: 'data' }], foo: 'bar' };
        apiRequest.mockResolvedValue(apiResponse);
        const constructedData = [{ json: { foo: 'bar', index: 0 } }];
        mockExecuteFunctions.helpers.constructExecutionMetaData.mockReturnValue(constructedData);
        const result = await execute.call(mockExecuteFunctions, sheet, sheetName);
        expect(apiRequest).toHaveBeenCalledTimes(1);
        expect(apiRequest).toHaveBeenCalledWith('POST', '/v4/spreadsheets/spreadsheet123:batchUpdate', {
            requests: [
                {
                    deleteSheet: {
                        sheetId: 'sheet456',
                    },
                },
            ],
        });
        expect(result).toEqual(constructedData);
    });
    test('should process multiple items', async () => {
        const items = [{ json: {} }, { json: {} }];
        mockExecuteFunctions.getInputData.mockReturnValue(items);
        const apiResponses = [
            { replies: [{ some: 'data1' }], foo: 'bar1' },
            { replies: [{ some: 'data2' }], foo: 'bar2' },
        ];
        apiRequest
            .mockResolvedValueOnce(apiResponses[0])
            .mockResolvedValueOnce(apiResponses[1]);
        const constructedDataItem0 = [{ json: { foo: 'bar1', index: 0 } }];
        const constructedDataItem1 = [{ json: { foo: 'bar2', index: 1 } }];
        mockExecuteFunctions.helpers.constructExecutionMetaData
            .mockReturnValueOnce(constructedDataItem0)
            .mockReturnValueOnce(constructedDataItem1);
        const result = await execute.call(mockExecuteFunctions, sheet, sheetName);
        expect(apiRequest).toHaveBeenCalledTimes(2);
        expect(apiRequest).toHaveBeenNthCalledWith(1, 'POST', '/v4/spreadsheets/spreadsheet123:batchUpdate', {
            requests: [
                {
                    deleteSheet: {
                        sheetId: 'sheet456',
                    },
                },
            ],
        });
        expect(apiRequest).toHaveBeenNthCalledWith(2, 'POST', '/v4/spreadsheets/spreadsheet123:batchUpdate', {
            requests: [
                {
                    deleteSheet: {
                        sheetId: 'sheet456',
                    },
                },
            ],
        });
        expect(result).toEqual([...constructedDataItem0, ...constructedDataItem1]);
    });
});
//# sourceMappingURL=remove.test.js.map