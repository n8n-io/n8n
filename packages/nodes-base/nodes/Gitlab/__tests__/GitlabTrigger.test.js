import { GitlabTrigger } from '../GitlabTrigger.node';
vi.mock('../GitlabTriggerHelpers', () => ({
    generateWebhookSecret: vi.fn(() => 'generated-secret'),
    verifySignature: vi.fn(),
}));
import { verifySignature } from '../GitlabTriggerHelpers';
describe('GitlabTrigger', () => {
    let trigger;
    let mockWebhookFunctions;
    let mockResponse;
    beforeEach(() => {
        trigger = new GitlabTrigger();
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
            end: vi.fn().mockReturnThis(),
        };
        mockWebhookFunctions = {
            getBodyData: vi.fn().mockReturnValue({}),
            getHeaderData: vi.fn().mockReturnValue({}),
            getQueryData: vi.fn().mockReturnValue({}),
            getResponseObject: vi.fn().mockReturnValue(mockResponse),
            helpers: {
                returnJsonArray: vi.fn((data) => data),
            },
        };
        verifySignature.mockReturnValue(true);
    });
    describe('webhook', () => {
        it('should return 401 when verification fails', async () => {
            verifySignature.mockReturnValue(false);
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
            expect(result).toEqual({ noWebhookResponse: true });
        });
        it('should trigger workflow when verification succeeds', async () => {
            const bodyData = {
                object_kind: 'push',
                project: { id: 1 },
            };
            const headerData = { 'x-gitlab-event': 'Push Hook' };
            const queryData = {};
            mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);
            mockWebhookFunctions.getHeaderData.mockReturnValue(headerData);
            mockWebhookFunctions.getQueryData.mockReturnValue(queryData);
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(result.workflowData).toBeDefined();
            expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith([
                {
                    body: bodyData,
                    headers: headerData,
                    query: queryData,
                },
            ]);
        });
        it('should trigger workflow when no secret is stored (backward compatibility)', async () => {
            // verifySignature returns true via skipIfNoExpectedSignature when secret is missing
            verifySignature.mockReturnValue(true);
            const bodyData = { object_kind: 'push' };
            mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(result.workflowData).toBeDefined();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });
    describe('description', () => {
        it('should have correct node metadata', () => {
            expect(trigger.description.displayName).toBe('GitLab Trigger');
            expect(trigger.description.name).toBe('gitlabTrigger');
            expect(trigger.description.group).toContain('trigger');
        });
    });
});
//# sourceMappingURL=GitlabTrigger.test.js.map