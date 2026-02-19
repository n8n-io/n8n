import { GithubTrigger } from '../../GithubTrigger.node';
import * as GenericFunctions from '../../GenericFunctions';
import * as GithubTriggerHelpers from '../../GithubTriggerHelpers';
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
				getNodeWebhookUrl: () => 'https://example.com/webhook',
				getNodeParameter: jest.fn().mockImplementation((name: string) => {
					if (name === 'owner') return 'some-owner';
					if (name === 'repository') return 'some-repo';
				}),
			};
		});

		it('should return true when stored webhook ID exists', async () => {
			jest.spyOn(GenericFunctions, 'githubApiRequest').mockResolvedValueOnce({ id: '123456' });

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe('123456');
		});

		it('should fall back to URL matching when stored ID returns 404', async () => {
			const existingWebhook = {
				id: '789',
				events: ['push'],
				config: { url: 'https://example.com/webhook' },
			};

			jest
				.spyOn(GenericFunctions, 'githubApiRequest')
				.mockRejectedValueOnce({ httpCode: '404' }) // GET by ID fails
				.mockResolvedValueOnce([existingWebhook]); // GET all returns match

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe('789');
			expect(webhookData.webhookEvents).toEqual(['push']);
		});

		it('should return false when stored ID is 404 and no URL match found', async () => {
			jest
				.spyOn(GenericFunctions, 'githubApiRequest')
				.mockRejectedValueOnce({ httpCode: '404' }) // GET by ID fails
				.mockResolvedValueOnce([]); // GET all returns empty

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(false);
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookEvents).toBeUndefined();
		});

		it('should find webhook by URL when no stored ID exists', async () => {
			webhookData = {};
			mockThis.getWorkflowStaticData = () => webhookData;

			const existingWebhook = {
				id: '789',
				events: ['push'],
				config: { url: 'https://example.com/webhook' },
			};

			jest
				.spyOn(GenericFunctions, 'githubApiRequest')
				.mockResolvedValueOnce([existingWebhook]);

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe('789');
		});

		it('should return false when no stored ID and no URL match', async () => {
			webhookData = {};
			mockThis.getWorkflowStaticData = () => webhookData;

			jest.spyOn(GenericFunctions, 'githubApiRequest').mockResolvedValueOnce([]);

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(false);
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

		it('should return true and set webhookId and webhookSecret when creation succeeds', async () => {
			const createdWebhook = { id: '789', active: true };

			jest.spyOn(GenericFunctions, 'githubApiRequest').mockResolvedValueOnce(createdWebhook);

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.create.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe('789');
			expect(webhookData.webhookSecret).toBeDefined();
			expect(typeof webhookData.webhookSecret).toBe('string');
			expect(webhookData.webhookSecret.length).toBe(64); // 32 bytes in hex
		});

		it('should send the secret to GitHub API when creating webhook', async () => {
			const createdWebhook = { id: '789', active: true };

			const apiRequestSpy = jest
				.spyOn(GenericFunctions, 'githubApiRequest')
				.mockResolvedValueOnce(createdWebhook);

			const trigger = new GithubTrigger();
			await trigger.webhookMethods.default.create.call(mockThis);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/repos/some-owner/some-repo/hooks',
				expect.objectContaining({
					config: expect.objectContaining({
						secret: expect.any(String),
					}),
				}),
			);
		});

		it('should handle 422 by checking for existing matching webhook (no secret stored)', async () => {
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
			// Existing webhook won't have secret stored (backwards compatibility)
			expect(webhookData.webhookSecret).toBeUndefined();
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

	describe('delete webhook method', () => {
		let webhookData: Record<string, any>;
		let mockThis: any;

		beforeEach(() => {
			webhookData = {
				webhookId: '123456',
				webhookEvents: ['push'],
				webhookSecret: 'test-secret',
			};

			mockThis = {
				getWorkflowStaticData: () => webhookData,
				getNodeParameter: jest.fn().mockImplementation((name: string) => {
					if (name === 'owner') return 'some-owner';
					if (name === 'repository') return 'some-repo';
				}),
			};
		});

		it('should delete webhook data including secret when deletion succeeds', async () => {
			jest.spyOn(GenericFunctions, 'githubApiRequest').mockResolvedValueOnce({});

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.delete.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookEvents).toBeUndefined();
			expect(webhookData.webhookSecret).toBeUndefined();
		});
	});

	describe('webhook method', () => {
		let mockThis: any;
		let webhookData: Record<string, any>;

		beforeEach(() => {
			webhookData = {
				webhookSecret: 'test-secret',
			};

			mockThis = {
				getWorkflowStaticData: () => webhookData,
				getBodyData: jest.fn().mockReturnValue({ action: 'opened' }),
				getHeaderData: jest.fn().mockReturnValue({}),
				getQueryData: jest.fn().mockReturnValue({}),
				getResponseObject: jest.fn().mockReturnValue({
					status: jest.fn().mockReturnThis(),
					send: jest.fn().mockReturnThis(),
					end: jest.fn(),
				}),
				getRequestObject: jest.fn().mockReturnValue({
					header: jest.fn(),
					rawBody: '{}',
				}),
				helpers: {
					returnJsonArray: jest.fn().mockImplementation((data) => data),
				},
			};
		});

		it('should reject with 401 when signature verification fails', async () => {
			jest.spyOn(GithubTriggerHelpers, 'verifySignature').mockReturnValueOnce(false);

			const trigger = new GithubTrigger();
			const result = await trigger.webhook.call(mockThis);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockThis.getResponseObject).toHaveBeenCalled();
		});

		it('should process webhook when signature verification succeeds', async () => {
			jest.spyOn(GithubTriggerHelpers, 'verifySignature').mockReturnValueOnce(true);

			const trigger = new GithubTrigger();
			const result = await trigger.webhook.call(mockThis);

			expect(result).toHaveProperty('workflowData');
		});

		it('should return OK for ping events when signature verification succeeds', async () => {
			jest.spyOn(GithubTriggerHelpers, 'verifySignature').mockReturnValueOnce(true);
			mockThis.getBodyData.mockReturnValue({ hook_id: '123' });

			const trigger = new GithubTrigger();
			const result = await trigger.webhook.call(mockThis);

			expect(result).toEqual({ webhookResponse: 'OK' });
		});
	});
});
