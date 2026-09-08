import { Github } from '../../Github.node';
describe('Github Node - Webhook Method', () => {
    let githubNode;
    let mockWebhookFunctions;
    beforeEach(() => {
        githubNode = new Github();
        mockWebhookFunctions = {
            getRequestObject: vi.fn(),
            getResponseObject: vi.fn(),
            getNodeParameter: vi.fn(),
            getNode: vi.fn(),
            helpers: {
                returnJsonArray: vi.fn(),
            },
        };
    });
    it('should process webhook request and return workflowData', async () => {
        const sampleWebhookBody = {
            action: 'opened',
            issue: {
                number: 123,
                title: 'Test Issue',
                body: 'This is a test issue',
                user: {
                    login: 'testuser',
                },
            },
            repository: {
                name: 'test-repo',
                owner: {
                    login: 'test-owner',
                },
            },
        };
        const mockRequestObject = {
            body: sampleWebhookBody,
            headers: {
                'x-github-event': 'issues',
                'x-github-delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
            },
        };
        mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequestObject);
        mockWebhookFunctions.helpers.returnJsonArray.mockReturnValue([sampleWebhookBody]);
        const result = await githubNode.webhook.call(mockWebhookFunctions);
        expect(result).toEqual({
            workflowData: [[sampleWebhookBody]],
        });
        expect(mockWebhookFunctions.getRequestObject).toHaveBeenCalled();
        expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith(sampleWebhookBody);
    });
});
//# sourceMappingURL=Github.webhook.test.js.map