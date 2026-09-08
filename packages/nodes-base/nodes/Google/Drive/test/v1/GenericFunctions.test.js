import { mockDeep } from 'vitest-mock-extended';
import { googleApiRequestAllItems } from '../../v1/GenericFunctions';
describe('googleApiRequestAllItems', () => {
    let mockContext;
    beforeEach(() => {
        mockContext = mockDeep();
        mockContext.getNodeParameter.mockReturnValue('oAuth2');
    });
    afterEach(() => {
        vi.resetAllMocks();
    });
    it('should advance pageToken across pages and terminate when nextPageToken is absent', async () => {
        const pageTokensReceived = [];
        mockContext.helpers.requestOAuth2.mockImplementation(async (_cred, opts) => {
            const qs = opts.qs;
            pageTokensReceived.push(qs.pageToken);
            if (pageTokensReceived.length === 1) {
                return { files: [{ id: '1' }, { id: '2' }], nextPageToken: 'token-page-2' };
            }
            if (pageTokensReceived.length === 2) {
                return { files: [{ id: '3' }], nextPageToken: 'token-page-3' };
            }
            return { files: [{ id: '4' }] };
        });
        const result = await googleApiRequestAllItems.call(mockContext, 'files', 'GET', '/drive/v3/files', {}, {});
        expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }]);
        expect(mockContext.helpers.requestOAuth2).toHaveBeenCalledTimes(3);
        expect(pageTokensReceived).toEqual([undefined, 'token-page-2', 'token-page-3']);
    });
    it('should handle single page (no nextPageToken)', async () => {
        mockContext.helpers.requestOAuth2.mockResolvedValueOnce({
            files: [{ id: '1' }],
        });
        const result = await googleApiRequestAllItems.call(mockContext, 'files', 'GET', '/drive/v3/files', {}, {});
        expect(result).toEqual([{ id: '1' }]);
        expect(mockContext.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=GenericFunctions.test.js.map