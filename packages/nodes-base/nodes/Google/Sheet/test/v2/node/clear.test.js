import { execute } from '../../../v2/actions/sheet/clear.operation';
describe('Google Sheet - Clear', () => {
    let mockExecuteFunctions;
    let mockSheet;
    beforeEach(() => {
        mockExecuteFunctions = {
            getInputData: vi.fn().mockReturnValue([{ json: {} }]),
            getNodeParameter: vi.fn(),
        };
        mockSheet = {
            clearData: vi.fn(),
            getData: vi.fn().mockResolvedValue([['Header1', 'Header2']]), // Mock first-row data
            updateRows: vi.fn(),
        };
    });
    test('should clear the whole sheet', async () => {
        mockExecuteFunctions.getNodeParameter = vi.fn((param) => {
            if (param === 'clear')
                return 'wholeSheet';
            return false;
        });
        await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1');
        expect(mockSheet.clearData).toHaveBeenCalledWith('Sheet1');
    });
    test('should clear specific rows', async () => {
        mockExecuteFunctions.getNodeParameter = vi.fn((param) => {
            if (param === 'clear')
                return 'specificRows';
            if (param === 'startIndex')
                return 2;
            if (param === 'rowsToDelete')
                return 3;
            return false;
        });
        await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1');
        expect(mockSheet.clearData).toHaveBeenCalledWith('Sheet1!2:4');
    });
    test('should clear specific columns', async () => {
        mockExecuteFunctions.getNodeParameter = vi.fn((param) => {
            if (param === 'clear')
                return 'specificColumns';
            if (param === 'startIndex')
                return 'B';
            if (param === 'columnsToDelete')
                return 2;
            return false;
        });
        await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1');
        expect(mockSheet.clearData).toHaveBeenCalledWith('Sheet1!B:C');
    });
    test('should clear a specific range', async () => {
        mockExecuteFunctions.getNodeParameter = vi.fn((param) => {
            if (param === 'clear')
                return 'specificRange';
            if (param === 'range')
                return 'A1:C5';
            return false;
        });
        await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1');
        expect(mockSheet.clearData).toHaveBeenCalledWith('Sheet1!A1:C5');
    });
    test('should keep the first row when clearing the whole sheet', async () => {
        mockExecuteFunctions.getNodeParameter = vi.fn((param) => {
            if (param === 'clear')
                return 'wholeSheet';
            if (param === 'keepFirstRow')
                return true;
            return false;
        });
        await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1');
        expect(mockSheet.getData).toHaveBeenCalledWith('Sheet1!1:1', 'FORMATTED_VALUE');
        expect(mockSheet.clearData).toHaveBeenCalledWith('Sheet1');
        expect(mockSheet.updateRows).toHaveBeenCalledWith('Sheet1', [['Header1', 'Header2']], 'RAW', 1);
    });
});
//# sourceMappingURL=clear.test.js.map