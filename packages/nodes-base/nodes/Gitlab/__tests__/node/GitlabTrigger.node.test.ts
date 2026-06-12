import { GitlabTrigger } from '../../GitlabTrigger.node';
import * as GenericFunctions from '../../GenericFunctions';
import { NodeApiError } from 'n8n-workflow';

describe('GitlabTrigger Node', () => {
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
			jest.spyOn(GenericFunctions, 'gitlabApiRequest').mockRejectedValue({ httpCode: '404' });

			const trigger = new GitlabTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(false);
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookEvents).toBeUndefined();
		});

		it('should delete webhook data and return false when webhook description contains 404', async () => {
			jest
				.spyOn(GenericFunctions, 'gitlabApiRequest')
				.mockRejectedValue({ description: 'Gitlab answered with a status code of 404.' });

			const trigger = new GitlabTrigger();
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

			jest.spyOn(GenericFunctions, 'gitlabApiRequest').mockResolvedValueOnce(createdWebhook); // Simulate successful POST

			const trigger = new GitlabTrigger();
			const result = await trigger.webhookMethods.default.create.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe('789');
		});

		it('should throw NodeApiError if repo is not found (404)', async () => {
			jest.spyOn(GenericFunctions, 'gitlabApiRequest').mockRejectedValue({ httpCode: '404' });

			const trigger = new GitlabTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				NodeApiError,
			);

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/The resource you are requesting could not be found/,
			);
		});
	});
});
