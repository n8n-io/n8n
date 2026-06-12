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
				getNodeParameter: jest.fn().mockImplementation((name: string) => {
					if (name === 'scope') return 'repository';
					if (name === 'owner') return 'some-owner';
					if (name === 'repository') return 'some-repo';
					return undefined;
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

		it('should use org endpoint when webhookScope is organization', async () => {
			webhookData.webhookScope = 'organization';
			webhookData.webhookOrg = 'my-org';
			mockThis.getNodeParameter = jest.fn().mockImplementation((name: string) => {
				if (name === 'scope') return 'organization';
				if (name === 'organization') return 'my-org';
				return undefined;
			});

			const apiRequestSpy = jest
				.spyOn(GenericFunctions, 'githubApiRequest')
				.mockResolvedValueOnce({});

			const trigger = new GithubTrigger();
			await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/orgs/my-org/hooks/123456',
				{},
			);
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
					if (name === 'scope') return 'repository';
					if (name === 'owner') return 'some-owner';
					if (name === 'repository') return 'some-repo';
					if (name === 'events') return ['push'];
					if (name === 'options') return { insecureSSL: false };
					return undefined;
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

		it('should use org endpoint when scope is organization', async () => {
			mockThis.getNodeParameter = jest.fn().mockImplementation((name: string) => {
				if (name === 'scope') return 'organization';
				if (name === 'organization') return 'my-org';
				if (name === 'events') return ['issues', 'pull_request'];
				if (name === 'options') return { insecureSSL: false };
				return undefined;
			});

			const createdWebhook = { id: '999', active: true };
			const apiRequestSpy = jest
				.spyOn(GenericFunctions, 'githubApiRequest')
				.mockResolvedValueOnce(createdWebhook);

			const trigger = new GithubTrigger();
			await trigger.webhookMethods.default.create.call(mockThis);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/orgs/my-org/hooks',
				expect.objectContaining({
					name: 'web',
					events: ['issues', 'pull_request'],
					active: true,
					config: expect.objectContaining({
						content_type: 'json',
						secret: expect.any(String),
					}),
				}),
			);
			expect(webhookData.webhookId).toBe('999');
			expect(webhookData.webhookScope).toBe('organization');
			expect(webhookData.webhookOrg).toBe('my-org');
		});

		it('should throw org-specific message when org is not found (404)', async () => {
			mockThis.getNodeParameter = jest.fn().mockImplementation((name: string) => {
				if (name === 'scope') return 'organization';
				if (name === 'organization') return 'nonexistent-org';
				if (name === 'events') return ['issues'];
				if (name === 'options') return { insecureSSL: false };
				return undefined;
			});

			jest.spyOn(GenericFunctions, 'githubApiRequest').mockRejectedValue({ httpCode: '404' });

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				NodeOperationError,
			);

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/Check that the organization exists/,
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
					if (name === 'scope') return 'repository';
					if (name === 'owner') return 'some-owner';
					if (name === 'repository') return 'some-repo';
					return undefined;
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

		it('should use org endpoint when webhookScope is organization', async () => {
			webhookData.webhookScope = 'organization';
			webhookData.webhookOrg = 'my-org';

			const apiRequestSpy = jest
				.spyOn(GenericFunctions, 'githubApiRequest')
				.mockResolvedValueOnce({});

			const trigger = new GithubTrigger();
			await trigger.webhookMethods.default.delete.call(mockThis);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				'DELETE',
				'/orgs/my-org/hooks/123456',
				{},
			);
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookScope).toBeUndefined();
			expect(webhookData.webhookOrg).toBeUndefined();
		});
	});

	describe('node description', () => {
		it('should have scope and organization parameters when scope is organization', () => {
			const trigger = new GithubTrigger();
			const scopeParam = trigger.description.properties.find((p) => p.name === 'scope');
			const orgParam = trigger.description.properties.find((p) => p.name === 'organization');

			expect(scopeParam).toBeDefined();
			expect(scopeParam?.options).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ value: 'repository' }),
					expect.objectContaining({ value: 'organization' }),
				]),
			);
			expect(orgParam).toBeDefined();
			expect(orgParam?.displayOptions?.show).toEqual({ scope: ['organization'] });
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
