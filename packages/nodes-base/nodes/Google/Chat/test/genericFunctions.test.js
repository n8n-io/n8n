import { mock } from 'vitest-mock-extended';
import * as googleHelpers from '../../GenericFunctions';
import { googleApiRequest } from '../GenericFunctions';
vi.mock('../../GenericFunctions', async () => ({
    ...(await vi.importActual('../../GenericFunctions')),
    getGoogleAccessToken: vi.fn().mockResolvedValue({ access_token: 'mock-access-token' }),
}));
describe('Test GoogleChat, googleApiRequest', () => {
    let mockExecuteFunctions;
    beforeEach(() => {
        mockExecuteFunctions = mock();
        mockExecuteFunctions.helpers = {
            requestWithAuthentication: vi.fn().mockResolvedValue({}),
            request: vi.fn().mockResolvedValue({}),
        };
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    it('should call requestWithAuthentication when authentication set to OAuth2', async () => {
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('oAuth2'); // authentication
        const result = await googleApiRequest.call(mockExecuteFunctions, 'POST', '/test-resource', {
            text: 'test',
        });
        expect(result).toEqual({ success: true });
        expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
        expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith('googleChatOAuth2Api', {
            body: { text: 'test' },
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            json: true,
            method: 'POST',
            qs: {},
            qsStringifyOptions: { arrayFormat: 'repeat' },
            uri: 'https://chat.googleapis.com/test-resource',
        });
    });
    it('should call request when authentication set to serviceAccount', async () => {
        const mockCredentials = {
            email: 'test@example.com',
            privateKey: 'private-key',
        };
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('serviceAccount');
        mockExecuteFunctions.getCredentials.mockResolvedValueOnce(mockCredentials);
        const result = await googleApiRequest.call(mockExecuteFunctions, 'GET', '/test-resource');
        expect(googleHelpers.getGoogleAccessToken).toHaveBeenCalledWith(mockCredentials, 'chat');
        expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(expect.objectContaining({
            headers: expect.objectContaining({
                Authorization: 'Bearer mock-access-token',
            }),
        }));
        expect(result).toEqual({ success: true });
    });
    it('should call request when noCredentials equals true', async () => {
        const result = await googleApiRequest.call(mockExecuteFunctions, 'GET', '/test-resource', {}, {}, undefined, true);
        expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledTimes(1);
        expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith({
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            json: true,
            method: 'GET',
            qs: {},
            qsStringifyOptions: { arrayFormat: 'repeat' },
            uri: 'https://chat.googleapis.com/test-resource',
        });
        expect(result).toEqual({ success: true });
    });
});
//# sourceMappingURL=genericFunctions.test.js.map