import { MailerLiteTriggerV2 } from '../../v2/MailerLiteTriggerV2.node';
vi.mock('../../v2/MailerLiteTriggerHelpers', () => ({
    verifySignature: vi.fn(),
}));
import { verifySignature } from '../../v2/MailerLiteTriggerHelpers';
describe('MailerLiteTriggerV2', () => {
    let trigger;
    let mockWebhookFunctions;
    let mockResponse;
    beforeEach(() => {
        vi.clearAllMocks();
        trigger = new MailerLiteTriggerV2({
            displayName: 'MailerLite Trigger',
            name: 'mailerLiteTrigger',
            icon: 'file:MailerLite.svg',
            group: ['trigger'],
            description: 'Starts the workflow when MailerLite events occur',
            defaultVersion: 2,
        });
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
            end: vi.fn().mockReturnThis(),
        };
        mockWebhookFunctions = {
            getBodyData: vi.fn(),
            getResponseObject: vi.fn().mockReturnValue(mockResponse),
            helpers: {
                returnJsonArray: vi.fn((data) => data),
            },
        };
        verifySignature.mockReturnValue(true);
    });
    describe('webhook', () => {
        it('should trigger workflow when signature is valid', async () => {
            const fields = [{ id: '1', name: 'subscriber.created' }];
            mockWebhookFunctions.getBodyData.mockReturnValue({ fields });
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(result.workflowData).toBeDefined();
            expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith(fields);
        });
        it('should return 401 when signature verification fails', async () => {
            verifySignature.mockReturnValue(false);
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
            expect(mockResponse.end).toHaveBeenCalled();
            expect(result).toEqual({ noWebhookResponse: true });
        });
        it('should trigger workflow when no secret is configured (backward compatibility)', async () => {
            // verifySignature returns true when no secret is configured
            verifySignature.mockReturnValue(true);
            const fields = [{ id: '1' }];
            mockWebhookFunctions.getBodyData.mockReturnValue({ fields });
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(result.workflowData).toBeDefined();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=MailerLiteTriggerV2.test.js.map