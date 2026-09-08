import { randomBytes } from 'crypto';
import { NodeApiError } from 'n8n-workflow';
import { apiRequest } from '../GenericFunctions';
import { TypeformTrigger } from '../TypeformTrigger.node';
import { verifySignature } from '../TypeformTriggerHelpers';
vi.mock('../GenericFunctions');
vi.mock('../TypeformTriggerHelpers');
vi.mock('crypto', async () => ({
    ...(await vi.importActual('crypto')),
    randomBytes: vi.fn(),
}));
describe('TypeformTrigger', () => {
    let trigger;
    let mockHookFunctions;
    let mockWebhookFunctions;
    beforeEach(() => {
        vi.clearAllMocks();
        trigger = new TypeformTrigger();
        mockHookFunctions = {
            getNodeWebhookUrl: vi.fn(),
            getNodeParameter: vi.fn(),
            getWorkflowStaticData: vi.fn(),
            helpers: {
                requestWithAuthentication: vi.fn(),
                requestOAuth2: vi.fn(),
            },
        };
        mockWebhookFunctions = {
            getNode: vi.fn().mockReturnValue({ typeVersion: 1.1 }),
            getNodeParameter: vi.fn(),
            getBodyData: vi.fn(),
            getRequestObject: vi.fn(),
            getResponseObject: vi.fn(),
            getWorkflowStaticData: vi.fn(),
            helpers: {
                returnJsonArray: vi.fn((data) => data),
            },
        };
    });
    describe('webhookMethods.default.checkExists', () => {
        it('should return true when webhook exists', async () => {
            const webhookUrl = 'https://example.com/webhook';
            const formId = 'form-123';
            const webhookId = 'webhook-123';
            mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
            mockHookFunctions.getNodeParameter.mockReturnValue(formId);
            mockHookFunctions.getWorkflowStaticData.mockReturnValue({});
            apiRequest.mockResolvedValue({
                items: [
                    {
                        form_id: formId,
                        url: webhookUrl,
                        tag: webhookId,
                    },
                ],
            });
            const result = await trigger.webhookMethods.default.checkExists.call(mockHookFunctions);
            expect(result).toBe(true);
            expect(apiRequest).toHaveBeenCalledWith('GET', `forms/${formId}/webhooks`, {});
            expect(mockHookFunctions.getWorkflowStaticData).toHaveBeenCalledWith('node');
        });
        it('should return false when webhook does not exist', async () => {
            const webhookUrl = 'https://example.com/webhook';
            const formId = 'form-123';
            mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
            mockHookFunctions.getNodeParameter.mockReturnValue(formId);
            mockHookFunctions.getWorkflowStaticData.mockReturnValue({});
            apiRequest.mockResolvedValue({
                items: [
                    {
                        form_id: formId,
                        url: 'https://different-url.com/webhook',
                        tag: 'webhook-123',
                    },
                ],
            });
            const result = await trigger.webhookMethods.default.checkExists.call(mockHookFunctions);
            expect(result).toBe(false);
        });
        it('should return false when no webhooks exist', async () => {
            const webhookUrl = 'https://example.com/webhook';
            const formId = 'form-123';
            mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
            mockHookFunctions.getNodeParameter.mockReturnValue(formId);
            mockHookFunctions.getWorkflowStaticData.mockReturnValue({});
            apiRequest.mockResolvedValue({
                items: [],
            });
            const result = await trigger.webhookMethods.default.checkExists.call(mockHookFunctions);
            expect(result).toBe(false);
        });
    });
    describe('webhookMethods.default.create', () => {
        it('should create webhook with secret', async () => {
            const webhookUrl = 'https://example.com/webhook';
            const formId = 'form-123';
            const webhookSecret = 'a'.repeat(64); // 32 bytes = 64 hex chars
            mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
            mockHookFunctions.getNodeParameter.mockReturnValue(formId);
            mockHookFunctions.getWorkflowStaticData.mockReturnValue({});
            randomBytes.mockReturnValue({
                toString: vi.fn().mockReturnValue(webhookSecret),
            });
            apiRequest.mockResolvedValue({});
            const result = await trigger.webhookMethods.default.create.call(mockHookFunctions);
            expect(result).toBe(true);
            expect(randomBytes).toHaveBeenCalledWith(32);
            expect(apiRequest).toHaveBeenCalledWith('PUT', expect.stringContaining(`forms/${formId}/webhooks/n8n-`), {
                url: webhookUrl,
                enabled: true,
                verify_ssl: true,
                secret: webhookSecret,
            });
            const webhookData = mockHookFunctions.getWorkflowStaticData('node');
            expect(webhookData.webhookId).toBeDefined();
            expect(webhookData.webhookSecret).toBe(webhookSecret);
        });
        it('should save webhook secret in static data', async () => {
            const webhookUrl = 'https://example.com/webhook';
            const formId = 'form-123';
            const webhookSecret = 'test-secret-123';
            mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
            mockHookFunctions.getNodeParameter.mockReturnValue(formId);
            const webhookData = {};
            mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
            randomBytes.mockReturnValue({
                toString: vi.fn().mockReturnValue(webhookSecret),
            });
            apiRequest.mockResolvedValue({});
            await trigger.webhookMethods.default.create.call(mockHookFunctions);
            expect(webhookData.webhookSecret).toBe(webhookSecret);
            expect(webhookData.webhookId).toBeDefined();
        });
    });
    describe('webhookMethods.default.delete', () => {
        it('should delete webhook and clean up secret', async () => {
            const formId = 'form-123';
            const webhookId = 'webhook-123';
            mockHookFunctions.getNodeParameter.mockReturnValue(formId);
            const webhookData = {
                webhookId,
                webhookSecret: 'test-secret',
            };
            mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
            apiRequest.mockResolvedValue({});
            const result = await trigger.webhookMethods.default.delete.call(mockHookFunctions);
            expect(result).toBe(true);
            expect(apiRequest).toHaveBeenCalledWith('DELETE', `forms/${formId}/webhooks/${webhookId}`, {});
            expect(webhookData.webhookId).toBeUndefined();
            expect(webhookData.webhookSecret).toBeUndefined();
        });
        it('should return true when webhookId is not set', async () => {
            mockHookFunctions.getNodeParameter.mockReturnValue('form-123');
            mockHookFunctions.getWorkflowStaticData.mockReturnValue({});
            const result = await trigger.webhookMethods.default.delete.call(mockHookFunctions);
            expect(result).toBe(true);
            expect(apiRequest).not.toHaveBeenCalled();
        });
        it('should return false when deletion fails', async () => {
            const formId = 'form-123';
            const webhookId = 'webhook-123';
            mockHookFunctions.getNodeParameter.mockReturnValue(formId);
            const webhookData = {
                webhookId,
            };
            mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
            apiRequest.mockRejectedValue(new Error('Delete failed'));
            const result = await trigger.webhookMethods.default.delete.call(mockHookFunctions);
            expect(result).toBe(false);
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
            expect(result).toEqual({
                noWebhookResponse: true,
            });
        });
        it('should process webhook when signature verification passes', async () => {
            const bodyData = {
                form_response: {
                    definition: {
                        fields: [
                            {
                                id: 'field1',
                                title: 'Question 1',
                            },
                        ],
                    },
                    answers: [
                        {
                            field: { id: 'field1' },
                            type: 'text',
                            text: 'Answer 1',
                        },
                    ],
                },
            };
            verifySignature.mockReturnValue(true);
            mockWebhookFunctions.getNodeParameter.mockImplementation((name) => {
                if (name === 'simplifyAnswers')
                    return true;
                if (name === 'onlyAnswers')
                    return true;
                return null;
            });
            mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(verifySignature).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.workflowData).toBeDefined();
        });
        it('should throw error when form_response is missing', async () => {
            const bodyData = {};
            verifySignature.mockReturnValue(true);
            mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);
            await expect(trigger.webhook.call(mockWebhookFunctions)).rejects.toThrow(NodeApiError);
        });
        it('should throw error when definition is missing', async () => {
            const bodyData = {
                form_response: {
                    answers: [],
                },
            };
            verifySignature.mockReturnValue(true);
            mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);
            await expect(trigger.webhook.call(mockWebhookFunctions)).rejects.toThrow(NodeApiError);
        });
        it('should throw error when answers is missing', async () => {
            const bodyData = {
                form_response: {
                    definition: {
                        fields: [],
                    },
                },
            };
            verifySignature.mockReturnValue(true);
            mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);
            await expect(trigger.webhook.call(mockWebhookFunctions)).rejects.toThrow(NodeApiError);
        });
    });
});
//# sourceMappingURL=TypeformTrigger.node.test.js.map