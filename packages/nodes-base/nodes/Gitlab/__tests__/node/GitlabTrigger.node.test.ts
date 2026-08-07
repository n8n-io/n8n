import { GitlabTrigger } from '../../GitlabTrigger.node';
import * as GenericFunctions from '../../GenericFunctions';

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
				getNodeWebhookUrl: () => 'https://example.com/webhook',
				getNodeParameter: jest.fn().mockImplementation((name: string) => {
					if (name === 'owner') return 'some-owner';
					if (name === 'repository') return 'some-repo';
				}),
			};
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should return true when stored webhook ID exists', async () => {
			jest.spyOn(GenericFunctions, 'gitlabApiRequest').mockResolvedValueOnce({ id: '123456' });

			const trigger = new GitlabTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe('123456');
		});

		it('should fall back to URL matching when stored ID returns 404', async () => {
			const existingWebhook = {
				id: '789',
				url: 'https://example.com/webhook',
			};

			jest
				.spyOn(GenericFunctions, 'gitlabApiRequest')
				.mockRejectedValueOnce({ cause: { httpCode: '404' } })
				.mockResolvedValueOnce([existingWebhook]);

			const trigger = new GitlabTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe('789');
			expect(webhookData.webhookEvents).toBeUndefined();
		});

		it('should return false when stored ID is 404 and no URL match is found', async () => {
			jest
				.spyOn(GenericFunctions, 'gitlabApiRequest')
				.mockRejectedValueOnce({ cause: { httpCode: '404' } })
				.mockResolvedValueOnce([]);

			const trigger = new GitlabTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(false);
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookEvents).toBeUndefined();
		});

		it('should find a webhook by URL when no stored ID exists', async () => {
			webhookData = {};
			mockThis.getWorkflowStaticData = () => webhookData;

			jest
				.spyOn(GenericFunctions, 'gitlabApiRequest')
				.mockResolvedValueOnce([{ id: '789', url: 'https://example.com/webhook' }]);

			const trigger = new GitlabTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe('789');
		});

		it('should return false when no stored ID and no URL match is found', async () => {
			webhookData = {};
			mockThis.getWorkflowStaticData = () => webhookData;

			jest.spyOn(GenericFunctions, 'gitlabApiRequest').mockResolvedValueOnce([]);

			const trigger = new GitlabTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(false);
		});
	});
});
