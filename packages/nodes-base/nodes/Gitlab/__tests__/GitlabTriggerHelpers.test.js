import { generateWebhookSecret, verifySignature } from '../GitlabTriggerHelpers';
describe('GitlabTriggerHelpers', () => {
    describe('generateWebhookSecret', () => {
        it('should generate a 64-character hex string', () => {
            const secret = generateWebhookSecret();
            expect(secret).toHaveLength(64);
            expect(/^[0-9a-f]+$/.test(secret)).toBe(true);
        });
        it('should generate unique secrets', () => {
            const secret1 = generateWebhookSecret();
            const secret2 = generateWebhookSecret();
            expect(secret1).not.toBe(secret2);
        });
    });
    describe('verifySignature', () => {
        let mockWebhookFunctions;
        beforeEach(() => {
            mockWebhookFunctions = {
                getHeaderData: vi.fn(),
                getWorkflowStaticData: vi.fn(),
            };
        });
        it('should return true when no secret is stored (backward compatibility)', () => {
            mockWebhookFunctions.getHeaderData.mockReturnValue({});
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(true);
        });
        it('should return true when token matches stored secret', () => {
            const secret = 'auto-generated-secret';
            mockWebhookFunctions.getHeaderData.mockReturnValue({
                'x-gitlab-token': secret,
            });
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
                webhookSecret: secret,
            });
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(true);
        });
        it('should return false when token does not match (different length)', () => {
            mockWebhookFunctions.getHeaderData.mockReturnValue({
                'x-gitlab-token': 'wrong',
            });
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
                webhookSecret: 'correct-secret',
            });
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(false);
        });
        it('should return false when token does not match (same length)', () => {
            mockWebhookFunctions.getHeaderData.mockReturnValue({
                'x-gitlab-token': 'wrong-secret-aa',
            });
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
                webhookSecret: 'correct-secret-',
            });
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(false);
        });
        it('should return false when token header is missing but secret is stored', () => {
            mockWebhookFunctions.getHeaderData.mockReturnValue({});
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
                webhookSecret: 'expected-secret',
            });
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(false);
        });
        it('should return false when token header has wrong type', () => {
            mockWebhookFunctions.getHeaderData.mockReturnValue({
                'x-gitlab-token': ['unexpected-array'],
            });
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
                webhookSecret: 'expected-secret',
            });
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(false);
        });
    });
});
//# sourceMappingURL=GitlabTriggerHelpers.test.js.map