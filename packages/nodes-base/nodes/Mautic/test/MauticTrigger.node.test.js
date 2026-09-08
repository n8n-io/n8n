import { randomBytes } from 'crypto';
import { mauticApiRequest } from '../GenericFunctions';
import { MauticTrigger } from '../MauticTrigger.node';
import { verifySignature } from '../MauticTriggerHelpers';
vi.mock('../GenericFunctions');
vi.mock('../MauticTriggerHelpers');
vi.mock('crypto', async () => ({
    ...(await vi.importActual('crypto')),
    randomBytes: vi.fn(),
}));
describe('MauticTrigger', () => {
    let trigger;
    let mockHookFunctions;
    let mockWebhookFunctions;
    beforeEach(() => {
        vi.clearAllMocks();
        trigger = new MauticTrigger();
        mockHookFunctions = {
            getNodeWebhookUrl: vi.fn(),
            getNodeParameter: vi.fn(),
            getWorkflowStaticData: vi.fn(),
        };
        mockWebhookFunctions = {
            getRequestObject: vi.fn(),
            getResponseObject: vi.fn(),
            getWorkflowStaticData: vi.fn(),
            helpers: {
                returnJsonArray: vi.fn((data) => data),
            },
        };
    });
    describe('webhookMethods.default.create', () => {
        it('should create webhook with secret', async () => {
            const webhookUrl = 'https://example.com/webhook/path';
            const webhookSecret = 'a'.repeat(64);
            mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
            mockHookFunctions.getNodeParameter.mockImplementation((name) => {
                if (name === 'events')
                    return ['mautic.lead_post_save_new'];
                if (name === 'eventsOrder')
                    return 'ASC';
                return null;
            });
            mockHookFunctions.getWorkflowStaticData.mockReturnValue({});
            randomBytes.mockReturnValue({
                toString: vi.fn().mockReturnValue(webhookSecret),
            });
            mauticApiRequest.mockResolvedValue({ hook: { id: 'hook-123' } });
            const result = await trigger.webhookMethods.default.create.call(mockHookFunctions);
            expect(result).toBe(true);
            expect(randomBytes).toHaveBeenCalledWith(32);
            expect(mauticApiRequest).toHaveBeenCalledWith('POST', '/hooks/new', expect.objectContaining({
                secret: webhookSecret,
                webhookUrl,
            }));
            const webhookData = mockHookFunctions.getWorkflowStaticData('node');
            expect(webhookData.webhookId).toBe('hook-123');
            expect(webhookData.webhookSecret).toBe(webhookSecret);
        });
    });
    describe('webhookMethods.default.delete', () => {
        it('should delete webhook and clean up secret', async () => {
            const webhookData = {
                webhookId: 'hook-123',
                webhookSecret: 'test-secret',
            };
            mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
            mauticApiRequest.mockResolvedValue({});
            const result = await trigger.webhookMethods.default.delete.call(mockHookFunctions);
            expect(result).toBe(true);
            expect(mauticApiRequest).toHaveBeenCalledWith('DELETE', '/hooks/hook-123/delete');
            expect(webhookData.webhookId).toBeUndefined();
            expect(webhookData.webhookSecret).toBeUndefined();
        });
    });
    describe('webhook', () => {
        it('should return 401 when signature verification fails', async () => {
            const mockResponse = {
                status: vi.fn().mockReturnThis(),
                send: vi.fn().mockReturnThis(),
                end: vi.fn(),
            };
            verifySignature.mockReturnValue(false);
            mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(verifySignature).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
            expect(result).toEqual({ noWebhookResponse: true });
        });
        it('should process webhook when signature verification passes', async () => {
            const bodyData = {
                'mautic.lead_post_save_new': [{ contact: { id: 1, name: 'Test' } }],
            };
            verifySignature.mockReturnValue(true);
            mockWebhookFunctions.getRequestObject.mockReturnValue({
                body: bodyData,
            });
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(verifySignature).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.workflowData).toBeDefined();
        });
    });
});
//# sourceMappingURL=MauticTrigger.node.test.js.map