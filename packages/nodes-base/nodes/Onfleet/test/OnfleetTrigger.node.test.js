import { createHmac } from 'crypto';
import { OnfleetTrigger } from '../OnfleetTrigger.node';
describe('Onfleet Trigger Node', () => {
    let node;
    let mockWebhookFunctions;
    const testSecretHex = 'a'.repeat(64);
    const testBody = '{"taskId":"task123","actionContext":"COMPLETE"}';
    const computeSignature = (secretHex, body) => {
        const hmac = createHmac('sha512', Buffer.from(secretHex, 'hex'));
        hmac.update(Buffer.from(body));
        return hmac.digest('hex');
    };
    beforeEach(() => {
        node = new OnfleetTrigger();
        mockWebhookFunctions = {
            getWebhookName: vi.fn(),
            getRequestObject: vi.fn(),
            getResponseObject: vi.fn(),
            getBodyData: vi.fn(),
            getCredentials: vi.fn(),
            helpers: {
                returnJsonArray: vi.fn().mockImplementation((data) => [{ json: data }]),
            },
        };
    });
    describe('webhook', () => {
        describe('setup webhook validation', () => {
            it('should respond with text/plain content type and check query parameter', async () => {
                const mockRequest = {
                    query: {
                        check: 'validation-token-123',
                    },
                };
                const mockResponse = {
                    status: vi.fn().mockReturnThis(),
                    type: vi.fn().mockReturnThis(),
                    send: vi.fn().mockReturnThis(),
                };
                mockWebhookFunctions.getWebhookName.mockReturnValue('setup');
                mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
                mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
                const result = await node.webhook.call(mockWebhookFunctions);
                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.type).toHaveBeenCalledWith('text/plain');
                expect(mockResponse.send).toHaveBeenCalledWith('validation-token-123');
                expect(result).toEqual({ noWebhookResponse: true });
            });
        });
        describe('default webhook', () => {
            const mockRequestData = {
                taskId: 'task123',
                workerId: 'worker456',
                actionContext: 'COMPLETE',
            };
            it('should process the request when no signing secret is configured (backward compatibility)', async () => {
                const mockRequest = {
                    query: {},
                    header: vi.fn().mockReturnValue(undefined),
                    rawBody: Buffer.from(testBody),
                };
                mockWebhookFunctions.getWebhookName.mockReturnValue('default');
                mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
                mockWebhookFunctions.getCredentials.mockResolvedValue({
                    apiKey: 'test-api-key',
                });
                mockWebhookFunctions.getBodyData.mockReturnValue(mockRequestData);
                const result = await node.webhook.call(mockWebhookFunctions);
                expect(result).toEqual({
                    workflowData: [[{ json: mockRequestData }]],
                });
            });
            it('should process the request when the signature is valid', async () => {
                const validSignature = computeSignature(testSecretHex, testBody);
                const mockRequest = {
                    query: {},
                    header: vi.fn().mockImplementation((header) => {
                        if (header === 'x-onfleet-signature')
                            return validSignature;
                        return undefined;
                    }),
                    rawBody: Buffer.from(testBody),
                };
                mockWebhookFunctions.getWebhookName.mockReturnValue('default');
                mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
                mockWebhookFunctions.getCredentials.mockResolvedValue({
                    apiKey: 'test-api-key',
                    signingSecret: testSecretHex,
                });
                mockWebhookFunctions.getBodyData.mockReturnValue(mockRequestData);
                const result = await node.webhook.call(mockWebhookFunctions);
                expect(result).toEqual({
                    workflowData: [[{ json: mockRequestData }]],
                });
            });
            it('should respond with 401 and not trigger the workflow when the signature is invalid', async () => {
                const mockRequest = {
                    query: {},
                    header: vi.fn().mockImplementation((header) => {
                        if (header === 'x-onfleet-signature')
                            return 'f'.repeat(128);
                        return undefined;
                    }),
                    rawBody: Buffer.from(testBody),
                };
                const mockResponse = {
                    status: vi.fn().mockReturnThis(),
                    send: vi.fn().mockReturnThis(),
                    end: vi.fn().mockReturnThis(),
                };
                mockWebhookFunctions.getWebhookName.mockReturnValue('default');
                mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
                mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
                mockWebhookFunctions.getCredentials.mockResolvedValue({
                    apiKey: 'test-api-key',
                    signingSecret: testSecretHex,
                });
                const result = await node.webhook.call(mockWebhookFunctions);
                expect(mockResponse.status).toHaveBeenCalledWith(401);
                expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
                expect(mockResponse.end).toHaveBeenCalled();
                expect(result).toEqual({ noWebhookResponse: true });
                expect(mockWebhookFunctions.getBodyData).not.toHaveBeenCalled();
            });
        });
    });
});
//# sourceMappingURL=OnfleetTrigger.node.test.js.map