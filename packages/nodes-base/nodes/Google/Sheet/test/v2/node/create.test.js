import { execute } from '../../../v2/actions/sheet/create.operation';
import { getExistingSheetNames, hexToRgb } from '../../../v2/helpers/GoogleSheets.utils';
import { apiRequest } from '../../../v2/transport';
vi.mock('../../../v2/helpers/GoogleSheets.utils', () => ({
    getExistingSheetNames: vi.fn(),
    hexToRgb: vi.fn(),
}));
vi.mock('../../../v2/transport', () => ({
    apiRequest: vi.fn(),
}));
describe('Google Sheet - Create', () => {
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
    const sheetName = 'test-sheet';
    test('should create a new sheet with given title and options', async () => {
        const items = [{ json: {} }];
        const existingSheetNames = ['existing-sheet'];
        const sheetTitle = 'new-sheet';
        const options = { tabColor: '0aa55c' };
        const rgbColor = { red: 10, green: 165, blue: 92 };
        const responseData = {
            replies: [{ addSheet: { properties: { title: sheetTitle } } }],
        };
        mockExecuteFunctions.getInputData.mockReturnValue(items);
        mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
            if (paramName === 'title')
                return sheetTitle;
            if (paramName === 'options')
                return options;
        });
        getExistingSheetNames.mockResolvedValue(existingSheetNames);
        hexToRgb.mockReturnValue(rgbColor);
        apiRequest.mockResolvedValue(responseData);
        mockExecuteFunctions.helpers.constructExecutionMetaData = vi
            .fn()
            .mockReturnValue([{ json: responseData }]);
        const result = await execute.call(mockExecuteFunctions, sheet, sheetName);
        expect(result).toEqual([{ json: responseData }]);
        expect(getExistingSheetNames).toHaveBeenCalledWith(sheet);
        expect(apiRequest).toHaveBeenCalledWith('POST', `/v4/spreadsheets/${sheetName}:batchUpdate`, {
            requests: [
                {
                    addSheet: {
                        properties: {
                            title: sheetTitle,
                            tabColor: { red: 10 / 255, green: 165 / 255, blue: 92 / 255 },
                        },
                    },
                },
            ],
        });
    });
    test('should skip creating a sheet if the title already exists', async () => {
        const items = [{ json: {} }];
        const existingSheetNames = ['existing-sheet'];
        const sheetTitle = 'existing-sheet';
        mockExecuteFunctions.getInputData = vi.fn().mockReturnValue(items);
        mockExecuteFunctions.getNodeParameter = vi
            .fn()
            .mockImplementation((paramName) => {
            if (paramName === 'title')
                return sheetTitle;
            if (paramName === 'options')
                return {};
        });
        getExistingSheetNames.mockResolvedValue(existingSheetNames);
        const result = await execute.call(mockExecuteFunctions, sheet, sheetName);
        expect(result).toEqual([]);
        expect(getExistingSheetNames).toHaveBeenCalledWith(sheet);
        expect(apiRequest).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=create.test.js.map