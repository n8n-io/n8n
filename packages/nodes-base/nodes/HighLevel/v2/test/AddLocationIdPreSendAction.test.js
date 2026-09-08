import { addLocationIdPreSendAction } from '../GenericFunctions';
describe('addLocationIdPreSendAction', () => {
    let mockThis;
    beforeEach(() => {
        mockThis = {
            getNodeParameter: vi.fn(),
            getCredentials: vi.fn(),
        };
    });
    it('should add locationId to query parameters for contact getAll operation', async () => {
        mockThis.getNodeParameter
            .mockReturnValueOnce('contact')
            .mockReturnValueOnce('getAll');
        mockThis.getCredentials.mockResolvedValue({
            oauthTokenData: { locationId: '123' },
        });
        const requestOptions = {
            url: 'https://example.com/api',
            qs: {},
        };
        const result = await addLocationIdPreSendAction.call(mockThis, requestOptions);
        expect(result.qs).toEqual({ locationId: '123' });
    });
    it('should add locationId to the body for contact create operation', async () => {
        mockThis.getNodeParameter
            .mockReturnValueOnce('contact')
            .mockReturnValueOnce('create');
        mockThis.getCredentials.mockResolvedValue({
            oauthTokenData: { locationId: '123' },
        });
        const requestOptions = {
            url: 'https://example.com/api',
            body: {},
        };
        const result = await addLocationIdPreSendAction.call(mockThis, requestOptions);
        expect(result.body).toEqual({ locationId: '123' });
    });
    it('should add locationId to query parameters for opportunity getAll operation', async () => {
        mockThis.getNodeParameter
            .mockReturnValueOnce('opportunity')
            .mockReturnValueOnce('getAll');
        mockThis.getCredentials.mockResolvedValue({
            oauthTokenData: { locationId: '123' },
        });
        const requestOptions = {
            url: 'https://example.com/api',
            qs: {},
        };
        const result = await addLocationIdPreSendAction.call(mockThis, requestOptions);
        expect(result.qs).toEqual({ location_id: '123' });
    });
    it('should add locationId to the body for opportunity create operation', async () => {
        mockThis.getNodeParameter
            .mockReturnValueOnce('opportunity')
            .mockReturnValueOnce('create');
        mockThis.getCredentials.mockResolvedValue({
            oauthTokenData: { locationId: '123' },
        });
        const requestOptions = {
            url: 'https://example.com/api',
            body: {},
        };
        const result = await addLocationIdPreSendAction.call(mockThis, requestOptions);
        expect(result.body).toEqual({ locationId: '123' });
    });
    it('should not modify requestOptions if no resource or operation matches', async () => {
        mockThis.getNodeParameter
            .mockReturnValueOnce('unknown')
            .mockReturnValueOnce('unknown');
        mockThis.getCredentials.mockResolvedValue({
            oauthTokenData: { locationId: '123' },
        });
        const requestOptions = {
            url: 'https://example.com/api',
            body: {},
            qs: {},
        };
        const result = await addLocationIdPreSendAction.call(mockThis, requestOptions);
        expect(result).toEqual(requestOptions);
    });
});
//# sourceMappingURL=AddLocationIdPreSendAction.test.js.map