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
					if (name === 'authentication') return 'accessToken';
				}),
				getWorkflowStaticData: () => webhookData,
				getCredentials: jest.fn(),
				getNode: () => ({ name: 'GitHub Trigger' }),
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
			expect(webhookData.webhookEvents).toEqual(['push']);
		});

		it('should throw error when 422 occurs but no matching webhook found', async () => {
			jest
				.spyOn(GenericFunctions, 'githubApiRequest')
				.mockRejectedValueOnce({ httpCode: '422' }) // POST fails
				.mockResolvedValueOnce([]); // GET returns empty array

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				NodeOperationError,
			);

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/A webhook with the identical URL probably exists already/,
			);
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

		it('should provide specific error message for fine-grained PAT permission issues (403)', async () => {
			mockThis.getCredentials.mockResolvedValue({
				accessToken: 'github_pat_11ABCDEFGHIJKLMNOPQRSTUVWXYZ',
			});
			jest.spyOn(GenericFunctions, 'githubApiRequest').mockRejectedValue({ httpCode: '403' });

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				NodeOperationError,
			);

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/fine-grained tokens, ensure you have "Webhooks: Write" permission/,
			);
		});

		it('should provide specific error message for classic PAT permission issues (403)', async () => {
			mockThis.getCredentials.mockResolvedValue({
				accessToken: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
			});
			jest.spyOn(GenericFunctions, 'githubApiRequest').mockRejectedValue({ httpCode: '403' });

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				NodeOperationError,
			);

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/classic tokens, ensure you have "repo" or "admin:repo_hook" scope/,
			);
		});

		it('should provide specific error message for OAuth2 permission issues (403)', async () => {
			mockThis.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'owner') return 'some-owner';
				if (name === 'repository') return 'some-repo';
				if (name === 'events') return ['push'];
				if (name === 'options') return { insecureSSL: false };
				if (name === 'authentication') return 'oAuth2';
			});
			jest.spyOn(GenericFunctions, 'githubApiRequest').mockRejectedValue({ httpCode: '403' });

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				NodeOperationError,
			);

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/OAuth2 authentication, ensure your OAuth app has sufficient permissions/,
			);
		});

		it('should provide fallback error message if credential fetching fails (403)', async () => {
			mockThis.getCredentials.mockRejectedValue(new Error('Credential error'));
			jest.spyOn(GenericFunctions, 'githubApiRequest').mockRejectedValue({ httpCode: '403' });

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				NodeOperationError,
			);

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/Please check your access token has the required permissions/,
			);
		});

		it('should handle webhook creation response missing required data', async () => {
			const badResponse = { id: undefined, active: false };
			jest.spyOn(GenericFunctions, 'githubApiRequest').mockResolvedValueOnce(badResponse);

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				NodeOperationError,
			);

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/Github webhook creation response did not contain the expected data/,
			);
		});

		it('should handle unknown authentication type gracefully', async () => {
			mockThis.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'owner') return 'some-owner';
				if (name === 'repository') return 'some-repo';
				if (name === 'events') return ['push'];
				if (name === 'options') return { insecureSSL: false };
				if (name === 'authentication') return 'unknownType';
			});
			jest.spyOn(GenericFunctions, 'githubApiRequest').mockRejectedValue({ httpCode: '403' });

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				NodeOperationError,
			);

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/Please check your GitHub credentials have webhook creation permissions/,
			);
		});
	});

	describe('delete webhook method', () => {
		let mockThis: any;
		let webhookData: Record<string, any>;

		beforeEach(() => {
			webhookData = { webhookId: '123', webhookEvents: ['push'] };
			mockThis = {
				getWorkflowStaticData: () => webhookData,
				getNodeParameter: jest.fn().mockImplementation((name: string) => {
					if (name === 'owner') return 'some-owner';
					if (name === 'repository') return 'some-repo';
				}),
			};
		});

		it('should delete webhook and clear data when successful', async () => {
			jest.spyOn(GenericFunctions, 'githubApiRequest').mockResolvedValueOnce({});

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.delete.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookEvents).toBeUndefined();
		});

		it('should handle delete errors gracefully', async () => {
			jest.spyOn(GenericFunctions, 'githubApiRequest').mockRejectedValue({ 
				httpCode: '404',
				message: 'Webhook not found' 
			});

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.delete.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookEvents).toBeUndefined();
		});
	});
});
