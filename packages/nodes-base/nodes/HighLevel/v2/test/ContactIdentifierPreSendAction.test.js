import { contactIdentifierPreSendAction, isEmailValid, isPhoneValid } from '../GenericFunctions';
vi.mock('../GenericFunctions', async () => ({
    ...(await vi.importActual('../GenericFunctions')),
    isEmailValid: vi.fn(),
    isPhoneValid: vi.fn(),
}));
describe('contactIdentifierPreSendAction', () => {
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
            getNodeParameter: vi.fn((parameterName) => {
                if (parameterName === 'contactIdentifier')
                    return null;
                if (parameterName === 'updateFields')
                    return { contactIdentifier: 'default-identifier' };
                return undefined;
            }),
        };
    });
    it('should add email to requestOptions.body if identifier is a valid email', async () => {
        isEmailValid.mockReturnValue(true);
        isPhoneValid.mockReturnValue(false);
        mockThis.getNodeParameter.mockReturnValue('valid@example.com'); // Mock email
        const requestOptions = {
            url: 'https://example.com/api',
            body: {},
        };
        const result = await contactIdentifierPreSendAction.call(mockThis, requestOptions);
        expect(result.body).toEqual({ email: 'valid@example.com' });
    });
    it('should add phone to requestOptions.body if identifier is a valid phone', async () => {
        isEmailValid.mockReturnValue(false);
        isPhoneValid.mockReturnValue(true);
        mockThis.getNodeParameter.mockReturnValue('1234567890'); // Mock phone
        const requestOptions = {
            url: 'https://example.com/api',
            body: {},
        };
        const result = await contactIdentifierPreSendAction.call(mockThis, requestOptions);
        expect(result.body).toEqual({ phone: '1234567890' });
    });
    it('should add contactId to requestOptions.body if identifier is neither email nor phone', async () => {
        isEmailValid.mockReturnValue(false);
        isPhoneValid.mockReturnValue(false);
        mockThis.getNodeParameter.mockReturnValue('contact-id-123'); // Mock contactId
        const requestOptions = {
            url: 'https://example.com/api',
            body: {},
        };
        const result = await contactIdentifierPreSendAction.call(mockThis, requestOptions);
        expect(result.body).toEqual({ contactId: 'contact-id-123' });
    });
    it('should use updateFields.contactIdentifier if contactIdentifier is not provided', async () => {
        isEmailValid.mockReturnValue(true);
        isPhoneValid.mockReturnValue(false);
        mockThis.getNodeParameter.mockImplementation((parameterName) => {
            if (parameterName === 'contactIdentifier')
                return null;
            if (parameterName === 'updateFields')
                return { contactIdentifier: 'default-email@example.com' };
            return undefined;
        });
        const requestOptions = {
            url: 'https://example.com/api',
            body: {},
        };
        const result = await contactIdentifierPreSendAction.call(mockThis, requestOptions);
        expect(result.body).toEqual({ email: 'default-email@example.com' });
    });
    it('should initialize body as an empty object if it is undefined', async () => {
        isEmailValid.mockReturnValue(false);
        isPhoneValid.mockReturnValue(false);
        mockThis.getNodeParameter.mockReturnValue('identifier-123');
        const requestOptions = {
            url: 'https://example.com/api',
            body: undefined,
        };
        const result = await contactIdentifierPreSendAction.call(mockThis, requestOptions);
        expect(result.body).toEqual({ contactId: 'identifier-123' });
    });
});
//# sourceMappingURL=ContactIdentifierPreSendAction.test.js.map