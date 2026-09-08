import { TwilioTrigger } from '../TwilioTrigger.node';
import { verifySignature } from '../TwilioTriggerHelpers';
vi.mock('../TwilioTriggerHelpers');
describe('TwilioTrigger', () => {
    let trigger;
    let mockWebhookFunctions;
    beforeEach(() => {
        vi.clearAllMocks();
        trigger = new TwilioTrigger();
        mockWebhookFunctions = {
            getBodyData: vi.fn(),
            getResponseObject: vi.fn(),
            helpers: {
                returnJsonArray: vi.fn((data) => data),
            },
        };
    });
    describe('webhook', () => {
        it('should process the webhook when signature verification passes', async () => {
            const bodyData = [
                { specversion: '1.0', type: 'com.twilio.messaging.inbound-message.received' },
            ];
            verifySignature.mockResolvedValue(true);
            mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(verifySignature).toHaveBeenCalled();
            expect(result.workflowData).toBeDefined();
            expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith(bodyData);
        });
        it('should return 401 when signature verification fails', async () => {
            const mockResponse = {
                status: vi.fn().mockReturnThis(),
                send: vi.fn().mockReturnThis(),
                end: vi.fn(),
            };
            verifySignature.mockResolvedValue(false);
            mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(verifySignature).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
            expect(mockResponse.end).toHaveBeenCalled();
            expect(result).toEqual({ noWebhookResponse: true });
            expect(mockWebhookFunctions.getBodyData).not.toHaveBeenCalled();
        });
        it('should process the webhook when no auth token is configured (backward compat)', async () => {
            const bodyData = [
                { specversion: '1.0', type: 'com.twilio.voice.insights.call-summary.complete' },
            ];
            verifySignature.mockResolvedValue(true);
            mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(result.workflowData).toBeDefined();
        });
    });
});
//# sourceMappingURL=TwilioTrigger.node.test.js.map