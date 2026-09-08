import { mockDeep } from 'vitest-mock-extended';
import { processLines, quickBooksApiRequest } from '../GenericFunctions';
describe('quickBooksApiRequest', () => {
    const mockExecuteFunctions = mockDeep();
    beforeEach(() => {
        vi.resetAllMocks();
        mockExecuteFunctions.getNodeParameter.mockReturnValue('invoice');
        mockExecuteFunctions.getCredentials.mockResolvedValue({
            environment: 'production',
        });
    });
    it('should initialize headers for send operation', async () => {
        mockExecuteFunctions.getNodeParameter
            .mockReturnValueOnce('invoice')
            .mockReturnValueOnce('send');
        await quickBooksApiRequest.call(mockExecuteFunctions, 'POST', '/test', {}, {});
        expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith('quickBooksOAuth2Api', expect.objectContaining({
            headers: expect.objectContaining({
                'Content-Type': 'application/octet-stream',
            }),
        }));
    });
    it('should initialize headers for void operation', async () => {
        mockExecuteFunctions.getNodeParameter
            .mockReturnValueOnce('invoice')
            .mockReturnValueOnce('void');
        await quickBooksApiRequest.call(mockExecuteFunctions, 'POST', '/test', {}, {});
        expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith('quickBooksOAuth2Api', expect.objectContaining({
            headers: expect.objectContaining({
                'Content-Type': 'application/json',
            }),
        }));
    });
    it('should initialize headers for delete operation', async () => {
        mockExecuteFunctions.getNodeParameter
            .mockReturnValueOnce('payment')
            .mockReturnValueOnce('delete');
        await quickBooksApiRequest.call(mockExecuteFunctions, 'POST', '/test', {}, {});
        expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith('quickBooksOAuth2Api', expect.objectContaining({
            headers: expect.objectContaining({
                'Content-Type': 'application/json',
            }),
        }));
    });
    it('should initialize headers for download operation', async () => {
        mockExecuteFunctions.getNodeParameter
            .mockReturnValueOnce('invoice')
            .mockReturnValueOnce('get')
            .mockReturnValueOnce(true);
        await quickBooksApiRequest.call(mockExecuteFunctions, 'GET', '/test', {}, {});
        expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith('quickBooksOAuth2Api', expect.objectContaining({
            headers: expect.objectContaining({
                Accept: 'application/pdf',
            }),
        }));
    });
});
describe('processLines', () => {
    const mockExecuteFunctions = {
        getNodeParameter: vi.fn(),
    };
    test('should process AccountBasedExpenseLineDetail for bill resource', () => {
        const lines = [{ DetailType: 'AccountBasedExpenseLineDetail', accountId: '123' }];
        const result = processLines.call(mockExecuteFunctions, lines, 'bill');
        expect(result).toEqual([
            {
                DetailType: 'AccountBasedExpenseLineDetail',
                AccountBasedExpenseLineDetail: { AccountRef: { value: '123' } },
            },
        ]);
    });
    test('should process ItemBasedExpenseLineDetail for bill resource', () => {
        const lines = [{ DetailType: 'ItemBasedExpenseLineDetail', itemId: '456' }];
        const result = processLines.call(mockExecuteFunctions, lines, 'bill');
        expect(result).toEqual([
            {
                DetailType: 'ItemBasedExpenseLineDetail',
                ItemBasedExpenseLineDetail: { ItemRef: { value: '456' } },
            },
        ]);
    });
    test('should process SalesItemLineDetail for estimate resource', () => {
        const lines = [{ DetailType: 'SalesItemLineDetail', itemId: '789', TaxCodeRef: 'TAX1' }];
        const result = processLines.call(mockExecuteFunctions, lines, 'estimate');
        expect(result).toEqual([
            {
                DetailType: 'SalesItemLineDetail',
                SalesItemLineDetail: { ItemRef: { value: '789' }, TaxCodeRef: { value: 'TAX1' } },
            },
        ]);
    });
    test('should process SalesItemLineDetail for invoice resource with Qty', () => {
        const lines = [
            { DetailType: 'SalesItemLineDetail', itemId: '101', TaxCodeRef: 'TAX2', Qty: 10 },
        ];
        const result = processLines.call(mockExecuteFunctions, lines, 'invoice');
        expect(result).toEqual([
            {
                DetailType: 'SalesItemLineDetail',
                SalesItemLineDetail: { ItemRef: { value: '101' }, TaxCodeRef: { value: 'TAX2' }, Qty: 10 },
            },
        ]);
    });
    test('should process SalesItemLineDetail for invoice resource without Qty', () => {
        const lines = [{ DetailType: 'SalesItemLineDetail', itemId: '202', TaxCodeRef: 'TAX3' }];
        const result = processLines.call(mockExecuteFunctions, lines, 'invoice');
        expect(result).toEqual([
            {
                DetailType: 'SalesItemLineDetail',
                SalesItemLineDetail: { ItemRef: { value: '202' }, TaxCodeRef: { value: 'TAX3' } },
            },
        ]);
    });
});
//# sourceMappingURL=GenericFunctions.test.js.map