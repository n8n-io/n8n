import { execute } from '../../../v2/actions/sheet/read.operation';
describe('Google Sheet - Read', () => {
    let mockExecuteFunctions;
    let mockSheet;
    beforeEach(() => {
        mockExecuteFunctions = {
            getInputData: vi.fn().mockReturnValue([{ json: {} }]),
            getNode: vi.fn().mockReturnValue({ typeVersion: 4.5 }),
            getNodeParameter: vi.fn((param) => {
                const mockParams = {
                    options: {},
                    'filtersUI.values': [],
                    combineFilters: 'AND',
                };
                return mockParams[param];
            }),
        };
        mockSheet = {
            getData: vi.fn().mockResolvedValue([
                ['Header1', 'Header2'],
                ['Value1', 'Value2'],
            ]),
            lookupValues: vi.fn().mockResolvedValue([{ Header1: 'Value1', Header2: 'Value2' }]),
            structureArrayDataByColumn: vi
                .fn()
                .mockReturnValue([{ Header1: 'Value1', Header2: 'Value2' }]),
        };
    });
    test('should return structured sheet data when no filters are applied', async () => {
        const result = await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1');
        expect(mockSheet.getData).toHaveBeenCalled();
        expect(mockSheet.structureArrayDataByColumn).toHaveBeenCalled();
        expect(result).toEqual([
            {
                json: { Header1: 'Value1', Header2: 'Value2' },
                pairedItem: { item: 0 },
            },
        ]);
    });
    test('should call lookupValues when filters are provided', async () => {
        mockExecuteFunctions.getNodeParameter = vi.fn((param) => {
            if (param === 'filtersUI.values')
                return [{ lookupColumn: 'Header1', lookupValue: 'Value1' }];
            return '';
        });
        const result = await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1');
        expect(mockSheet.lookupValues).toHaveBeenCalled();
        expect(result).toEqual([
            {
                json: { Header1: 'Value1', Header2: 'Value2' },
                pairedItem: { item: 0 },
            },
        ]);
    });
    test('should return an empty array when sheet data is empty', async () => {
        mockSheet.getData = vi.fn().mockResolvedValue([]);
        const result = await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1');
        expect(result).toEqual([]);
    });
});
//# sourceMappingURL=read.test.js.map