import { GithubTrigger } from '../../GithubTrigger.node';
import * as GenericFunctions from '../../GenericFunctions';
import { NodeOperationError } from 'n8n-workflow';

describe('GithubTrigger Node', () => {
	describe('checkExists webhook method', () => {
		let webhookData: Record<string, any>;
		let mockThis: any;

		beforeEach(() => {
			webhookData = {
				webhookId: '123456',
				webhookEvents: ['push'],
			};

			mockThis = {
				getWorkflowStaticData: () => webhookData,
				getNodeParameter: jest.fn().mockImplementation((name: string) => {
					if (name === 'owner') return 'some-owner';
					if (name === 'repository') return 'some-repo';
				}),
			};
		});

		it('should delete webhook data and return false when webhook is not found (404)', async () => {
			jest.spyOn(GenericFunctions, 'githubApiRequest').mockRejectedValue({ httpCode: '404' });

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(false);
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookEvents).toBeUndefined();
		});
	});

	describe('create webhook method', () => {
		let mockThis: any;
		let webhookData: Record<string, any>;

		beforeEach(() => {
			webhookData = {};
			mockThis = {
				getNodeWebhookUrl: () => 'https://example.com/webhook',
				getNodeParameter: jest.fn().mockImplementation((name: string) => {
					if (name === 'owner') return 'some-owner';
					if (name === 'repository') return 'some-repo';
					if (name === 'events') return ['push'];
					if (name === 'options') return { insecureSSL: false };
				}),
				getWorkflowStaticData: () => webhookData,
				getNode: () => ({}),
			};
		});

		it('should return true and set webhookId when creation succeeds', async () => {
			const createdWebhook = { id: '789', active: true };

			jest.spyOn(GenericFunctions, 'githubApiRequest').mockResolvedValueOnce(createdWebhook); // Simulate successful POST

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.create.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe('789');
		});

		it('should handle 422 by checking for existing matching webhook', async () => {
			const existingWebhook = {
				id: '123',
				events: ['push'],
				config: { url: 'https://example.com/webhook' },
			};

			jest
				.spyOn(GenericFunctions, 'githubApiRequest')
				.mockRejectedValueOnce({ httpCode: '422' }) // POST fails
				.mockResolvedValueOnce([existingWebhook]); // GET returns matching

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.create.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe('123');
		});

		it('should throw NodeOperationError if repo is not found (404)', async () => {
			jest.spyOn(GenericFunctions, 'githubApiRequest').mockRejectedValue({ httpCode: '404' });

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				NodeOperationError,
			);

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/Check that the repository exists/,
			);
		});
	});
});
