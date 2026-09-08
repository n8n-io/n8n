import { TaigaTrigger } from '../TaigaTrigger.node';
import { verifySignature } from '../TaigaTriggerHelpers';
vi.mock('../TaigaTriggerHelpers');
describe('TaigaTrigger', () => {
    let trigger;
    let mockResponse;
    let mockWebhookFunctions;
    beforeEach(() => {
        vi.clearAllMocks();
        trigger = new TaigaTrigger();
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
            end: vi.fn(),
        };
        mockWebhookFunctions = {
            getNodeParameter: vi.fn(),
            getRequestObject: vi.fn(),
            getResponseObject: vi.fn().mockReturnValue(mockResponse),
            getWorkflowStaticData: vi.fn(),
            helpers: {
                returnJsonArray: vi.fn((data) => [{ json: data }]),
            },
        };
    });
    describe('webhook', () => {
        it('should return 401 when signature verification fails', async () => {
            verifySignature.mockReturnValue(false);
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(verifySignature).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
            expect(mockResponse.end).toHaveBeenCalled();
            expect(result).toEqual({ noWebhookResponse: true });
        });
        it('should process webhook when signature verification passes', async () => {
            const body = { action: 'create', type: 'issue', data: { id: 1 } };
            verifySignature.mockReturnValue(true);
            mockWebhookFunctions.getRequestObject.mockReturnValue({ body });
            mockWebhookFunctions.getNodeParameter.mockImplementation((name) => {
                if (name === 'operations')
                    return ['all'];
                if (name === 'resources')
                    return ['all'];
                return null;
            });
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(verifySignature).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(result.workflowData).toBeDefined();
            expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith(body);
        });
        it('should process webhook when no key is stored (backward compatibility)', async () => {
            const body = { action: 'change', type: 'task', data: { id: 2 } };
            // helper returns true when key is missing — simulate by returning true
            verifySignature.mockReturnValue(true);
            mockWebhookFunctions.getRequestObject.mockReturnValue({ body });
            mockWebhookFunctions.getNodeParameter.mockImplementation((name) => {
                if (name === 'operations')
                    return ['all'];
                if (name === 'resources')
                    return ['all'];
                return null;
            });
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(result.workflowData).toBeDefined();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=TaigaTrigger.node.test.js.map