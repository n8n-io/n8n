import { validEmailAndPhonePreSendAction, isEmailValid, isPhoneValid } from '../GenericFunctions';
vi.mock('../GenericFunctions', async () => ({
    ...(await vi.importActual('../GenericFunctions')),
    isEmailValid: vi.fn(),
    isPhoneValid: vi.fn(),
}));
describe('validEmailAndPhonePreSendAction', () => {
    let mockThis;
    beforeEach(() => {
        mockThis = {
            getNode: vi.fn(() => ({
                id: 'mock-node-id',
                name: 'mock-node',
                typeVersion: 1,
                type: 'n8n-nodes-base.mockNode',
                position: [0, 0],
                parameters: {},
            })),
        };
        vi.clearAllMocks();
    });
    it('should return requestOptions unchanged if email and phone are valid', async () => {
        isEmailValid.mockReturnValue(true);
        isPhoneValid.mockReturnValue(true);
        const requestOptions = {
            url: 'https://example.com/api',
            body: {
                email: 'valid@example.com',
                phone: '+1234567890',
            },
        };
        const result = await validEmailAndPhonePreSendAction.call(mockThis, requestOptions);
        expect(result).toEqual(requestOptions);
    });
    it('should not modify requestOptions if no email or phone is provided', async () => {
        const requestOptions = {
            url: 'https://example.com/api',
            body: {},
        };
        const result = await validEmailAndPhonePreSendAction.call(mockThis, requestOptions);
        expect(result).toEqual(requestOptions);
    });
    it('should not modify requestOptions if body is undefined', async () => {
        const requestOptions = {
            url: 'https://example.com/api',
            body: undefined,
        };
        const result = await validEmailAndPhonePreSendAction.call(mockThis, requestOptions);
        expect(result).toEqual(requestOptions);
    });
});
//# sourceMappingURL=ValidEmailAndPhonePreSendAction.test.js.map