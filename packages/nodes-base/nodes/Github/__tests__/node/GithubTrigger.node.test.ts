import { GithubTrigger } from '../../GithubTrigger.node';
import * as GenericFunctions from '../../GenericFunctions';
import * as GithubTriggerHelpers from '../../GithubTriggerHelpers';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

const createMockHookFunctions = (
	webhookData: Record<string, any>,
	{ insecureSSL = false }: { insecureSSL?: boolean } = {},
) => ({
	getNodeWebhookUrl: () => 'https://example.com/webhook',
	getWorkflowStaticData: () => webhookData,
	getNode: () => ({ name: 'Github Trigger' }),
	getActivationMode: () => 'activate',
	getWorkflow: () => ({ id: 'wf-1', name: 'wf', active: true }),
	logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
	getNodeParameter: vi.fn().mockImplementation((name: string) => {
		if (name === 'owner') return 'some-owner';
		if (name === 'repository') return 'some-repo';
		if (name === 'events') return ['push'];
		if (name === 'options') return { insecureSSL };
	}),
});

const mockExistingWebhook = (
	existingWebhook: Record<string, unknown> | { reject: unknown } = {
		id: 123,
		events: ['push'],
		config: { url: 'https://example.com/webhook' },
	},
) => {
	const spy = vi
		.spyOn(GenericFunctions, 'githubApiRequest')
		.mockRejectedValueOnce({ httpCode: '422' });

	return 'reject' in existingWebhook
		? spy.mockRejectedValueOnce(existingWebhook.reject)
		: spy.mockResolvedValueOnce(existingWebhook);
};

describe('GithubTrigger Node', () => {
	describe('checkExists webhook method', () => {
		let webhookData: Record<string, any>;
		let mockThis: any;

		beforeEach(() => {
			webhookData = {
				webhookId: '123456',
				webhookEvents: ['push'],
				webhookSecret: 'test-secret',
			};

			mockThis = createMockHookFunctions(webhookData);
		});

		it('should return false without calling the API when no secret is stored', async () => {
			delete webhookData.webhookSecret;
			const apiRequestSpy = vi
				.spyOn(GenericFunctions, 'githubApiRequest')
				.mockResolvedValue({ id: '123456' });

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(false);
			expect(apiRequestSpy).not.toHaveBeenCalled();
		});

		it('should treat a blank stored secret as no secret', async () => {
			webhookData.webhookSecret = '';
			const apiRequestSpy = vi
				.spyOn(GenericFunctions, 'githubApiRequest')
				.mockResolvedValue({ id: '123456' });

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(false);
			expect(apiRequestSpy).not.toHaveBeenCalled();
		});

		it('should return true when the webhook still exists and a secret is stored', async () => {
			vi.spyOn(GenericFunctions, 'githubApiRequest').mockResolvedValueOnce({ id: '123456' });

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(true);
		});

		it('should delete webhook data and return false when webhook is not found (404)', async () => {
			vi.spyOn(GenericFunctions, 'githubApiRequest').mockRejectedValue({ httpCode: '404' });

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(false);
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookEvents).toBeUndefined();
			expect(webhookData.webhookSecret).toBeUndefined();
		});
	});

	describe('create webhook method', () => {
		let mockThis: any;
		let webhookData: Record<string, any>;

		beforeEach(() => {
			webhookData = {};
			mockThis = createMockHookFunctions(webhookData);
		});

		/**
		 * A workflow that already registered hook 123 but predates stored secrets. The
		 * stored id is a number, as Github returns, while adopting stores a string, and
		 * the stored events are stale -- keep both that way or the assertions below stop
		 * proving anything.
		 */
		const withAdoptableWebhook = () => {
			webhookData.webhookId = 123;
			webhookData.webhookEvents = ['stale'];
		};

		it('should return true and set webhookId and webhookSecret when creation succeeds', async () => {
			const createdWebhook = { id: '789', active: true };

			vi.spyOn(GenericFunctions, 'githubApiRequest').mockResolvedValueOnce(createdWebhook);

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

			const apiRequestSpy = vi
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

		it('should store a secret and update the existing webhook when handling 422', async () => {
			withAdoptableWebhook();
			const apiRequestSpy = mockExistingWebhook().mockResolvedValueOnce({
				id: 123,
				active: true,
			});

			const trigger = new GithubTrigger();
			const result = await trigger.webhookMethods.default.create.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe('123');
			expect(webhookData.webhookEvents).toEqual(['push']);
			expect(webhookData.webhookSecret).toHaveLength(64);
			// Fetched by id, and without the create body, which holds the new secret.
			expect(apiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/repos/some-owner/some-repo/hooks/123',
				{},
			);
			expect(apiRequestSpy).toHaveBeenLastCalledWith(
				'PATCH',
				'/repos/some-owner/some-repo/hooks/123',
				expect.objectContaining({
					config: expect.objectContaining({ secret: expect.stringMatching(/^[0-9a-f]{64}$/) }),
				}),
			);
		});

		// Github replaces the config object wholesale, so anything omitted here is
		// dropped from the remote hook.
		it('should send the full config, not just the secret, when updating the existing webhook', async () => {
			withAdoptableWebhook();
			const apiRequestSpy = mockExistingWebhook({
				id: 123,
				events: ['push'],
				config: { url: 'https://example.com/webhook', content_type: 'form' },
			}).mockResolvedValueOnce({ id: 123, active: true });

			const trigger = new GithubTrigger();
			await trigger.webhookMethods.default.create.call(mockThis);

			expect(apiRequestSpy).toHaveBeenLastCalledWith(
				'PATCH',
				'/repos/some-owner/some-repo/hooks/123',
				{
					config: {
						url: 'https://example.com/webhook',
						content_type: 'json',
						insecure_ssl: '0',
						secret: expect.stringMatching(/^[0-9a-f]{64}$/),
					},
					events: ['push'],
					active: true,
				},
			);
		});

		it('should carry the insecureSSL option onto the updated webhook', async () => {
			withAdoptableWebhook();
			const apiRequestSpy = mockExistingWebhook().mockResolvedValueOnce({
				id: 123,
				active: true,
			});

			mockThis = createMockHookFunctions(webhookData, { insecureSSL: true });

			const trigger = new GithubTrigger();
			await trigger.webhookMethods.default.create.call(mockThis);

			expect(apiRequestSpy).toHaveBeenLastCalledWith(
				'PATCH',
				'/repos/some-owner/some-repo/hooks/123',
				expect.objectContaining({
					config: expect.objectContaining({ insecure_ssl: '1' }),
				}),
			);
		});

		it('should not store a secret when the existing webhook cannot be updated', async () => {
			withAdoptableWebhook();
			const apiError = new NodeApiError({ name: 'Github Trigger' } as never, {
				message: 'Forbidden',
				httpCode: '403',
			});
			mockExistingWebhook().mockRejectedValueOnce(apiError);

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/could not be updated with a signing secret/,
			);
			expect(webhookData.webhookSecret).toBeUndefined();
			expect(webhookData.webhookId).toBe(123);
		});

		// Github's stored events can differ from the node's configuration, so the
		// update brings them back in line instead of refusing to adopt the hook.
		it('should correct the events on the existing webhook', async () => {
			withAdoptableWebhook();
			const apiRequestSpy = mockExistingWebhook({
				id: 123,
				events: ['issues'],
				config: { url: 'https://example.com/webhook' },
			}).mockResolvedValueOnce({ id: 123, active: true });

			const trigger = new GithubTrigger();
			await trigger.webhookMethods.default.create.call(mockThis);

			expect(webhookData.webhookId).toBe('123');
			expect(apiRequestSpy).toHaveBeenLastCalledWith(
				'PATCH',
				'/repos/some-owner/some-repo/hooks/123',
				expect.objectContaining({ events: ['push'] }),
			);
		});

		// The negative assertion is the one that fails if `message` is quoted again.
		it('should quote Githubs reason rather than the generic status text', async () => {
			const apiError = new NodeApiError({ name: 'Github Trigger' } as never, {
				message:
					'422 - {"message":"Validation Failed","errors":[{"resource":"Hook","code":"custom"}]}',
				statusCode: 422,
				error: { message: 'Validation Failed' },
			});
			vi.spyOn(GenericFunctions, 'githubApiRequest').mockRejectedValueOnce(apiError);

			const trigger = new GithubTrigger();
			const attempt = trigger.webhookMethods.default.create.call(mockThis);

			await expect(attempt).rejects.toMatchObject({
				description: expect.stringContaining('Validation Failed'),
			});
			await expect(attempt).rejects.not.toMatchObject({
				description: expect.stringContaining('could not be processed by the service'),
			});
		});

		it('should refuse to adopt a webhook this workflow did not register', async () => {
			const apiRequestSpy = mockExistingWebhook({
				id: '999',
				events: ['push'],
				config: { url: 'https://example.com/webhook' },
			});

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/refused to create the webhook/,
			);
			expect(webhookData.webhookSecret).toBeUndefined();
			expect(webhookData.webhookId).toBeUndefined();
			expect(apiRequestSpy).toHaveBeenCalledTimes(1);
		});

		it('should refuse to adopt the stored webhook when its URL points elsewhere', async () => {
			withAdoptableWebhook();
			const apiRequestSpy = mockExistingWebhook({
				id: 123,
				events: ['push'],
				config: { url: 'https://example.com/somewhere-else' },
			});

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/refused to create the webhook/,
			);
			expect(webhookData.webhookSecret).toBeUndefined();
			expect(apiRequestSpy).not.toHaveBeenCalledWith('PATCH', expect.anything(), expect.anything());
		});

		it('should reject a stored webhook that carries no config', async () => {
			withAdoptableWebhook();
			mockExistingWebhook({ id: 123, events: ['push'] });

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/refused to create the webhook/,
			);
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should treat a deleted stored webhook as someone else holding the URL', async () => {
			withAdoptableWebhook();
			mockExistingWebhook({ reject: { httpCode: '404' } });

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/refused to create the webhook/,
			);
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should propagate a failure to fetch the stored webhook unchanged', async () => {
			withAdoptableWebhook();
			mockExistingWebhook({ reject: { httpCode: '403', message: 'Forbidden' } });

			const trigger = new GithubTrigger();
			const attempt = trigger.webhookMethods.default.create.call(mockThis);

			// Only a 404 means the hook is gone; anything else must not be relabelled.
			await expect(attempt).rejects.toMatchObject({ httpCode: '403' });
			await expect(attempt).rejects.not.toThrow(/refused to create the webhook/);
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should keep Githubs own reason alongside the added guidance', async () => {
			withAdoptableWebhook();
			const apiError = new NodeApiError({ name: 'Github Trigger' } as never, {
				message: 'Forbidden',
				httpCode: '403',
			});
			apiError.description = 'Resource not accessible by personal access token';
			mockExistingWebhook().mockRejectedValueOnce(apiError);

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toMatchObject({
				description: expect.stringContaining('Resource not accessible by personal access token'),
			});
			await expect(Promise.reject(apiError)).rejects.toMatchObject({
				description: expect.stringContaining('allowed to manage'),
			});
		});

		it('should rethrow a non-NodeApiError from the update untouched', async () => {
			withAdoptableWebhook();
			const plain = new Error('socket hang up');
			mockExistingWebhook().mockRejectedValueOnce(plain);

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				'socket hang up',
			);
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should not store a secret when Github reports the update was not applied', async () => {
			withAdoptableWebhook();
			mockExistingWebhook().mockResolvedValueOnce({ id: 123, active: false });

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/did not apply the update/,
			);
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should warn when a successful create strands the previously stored webhook', async () => {
			withAdoptableWebhook();
			vi.spyOn(GenericFunctions, 'githubApiRequest').mockResolvedValueOnce({
				id: 789,
				active: true,
			});

			const trigger = new GithubTrigger();
			await trigger.webhookMethods.default.create.call(mockThis);

			expect(webhookData.webhookId).toBe(789);
			expect(mockThis.logger.warn).toHaveBeenCalledWith(
				expect.stringMatching(/Webhook 123 may still be on the repository/),
				expect.objectContaining({ strandedWebhookId: 123 }),
			);
		});

		it('should not warn when a create had no previously stored webhook', async () => {
			vi.spyOn(GenericFunctions, 'githubApiRequest').mockResolvedValueOnce({
				id: 789,
				active: true,
			});

			const trigger = new GithubTrigger();
			await trigger.webhookMethods.default.create.call(mockThis);

			expect(mockThis.logger.warn).not.toHaveBeenCalled();
		});

		it('should throw NodeOperationError if repo is not found (404)', async () => {
			vi.spyOn(GenericFunctions, 'githubApiRequest').mockRejectedValue({ httpCode: '404' });

			const trigger = new GithubTrigger();

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				NodeOperationError,
			);

			await expect(trigger.webhookMethods.default.create.call(mockThis)).rejects.toThrow(
				/Check that the repository exists/,
			);
		});
	});

	describe('adopting a webhook registered before secrets were stored', () => {
		it('should re-register it against the same remote hook and store a secret', async () => {
			const webhookData: Record<string, any> = {
				webhookId: 424242,
				webhookEvents: ['stale'],
			};
			const mockThis: any = createMockHookFunctions(webhookData);

			const trigger = new GithubTrigger();

			const apiRequestSpy = vi.spyOn(GenericFunctions, 'githubApiRequest');
			expect(await trigger.webhookMethods.default.checkExists.call(mockThis)).toBe(false);
			expect(apiRequestSpy).not.toHaveBeenCalled();

			apiRequestSpy
				.mockRejectedValueOnce({ httpCode: '422' })
				.mockResolvedValueOnce({
					id: 424242,
					events: ['push'],
					config: { url: 'https://example.com/webhook' },
				})
				.mockResolvedValueOnce({ id: 424242, active: true });

			expect(await trigger.webhookMethods.default.create.call(mockThis)).toBe(true);

			expect(webhookData.webhookId).toBe('424242');
			expect(webhookData.webhookEvents).toEqual(['push']);
			expect(webhookData.webhookSecret).toHaveLength(64);
			expect(apiRequestSpy).toHaveBeenLastCalledWith(
				'PATCH',
				'/repos/some-owner/some-repo/hooks/424242',
				expect.objectContaining({
					config: expect.objectContaining({ secret: webhookData.webhookSecret }),
				}),
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
				getNodeParameter: vi.fn().mockImplementation((name: string) => {
					if (name === 'owner') return 'some-owner';
					if (name === 'repository') return 'some-repo';
				}),
			};
		});

		it('should delete webhook data including secret when deletion succeeds', async () => {
			vi.spyOn(GenericFunctions, 'githubApiRequest').mockResolvedValueOnce({});

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
				getBodyData: vi.fn().mockReturnValue({ action: 'opened' }),
				getHeaderData: vi.fn().mockReturnValue({}),
				getQueryData: vi.fn().mockReturnValue({}),
				getResponseObject: vi.fn().mockReturnValue({
					status: vi.fn().mockReturnThis(),
					send: vi.fn().mockReturnThis(),
					end: vi.fn(),
				}),
				getRequestObject: vi.fn().mockReturnValue({
					header: vi.fn(),
					rawBody: '{}',
				}),
				helpers: {
					returnJsonArray: vi.fn().mockImplementation((data) => data),
				},
			};
		});

		it('should reject with 401 when signature verification fails', async () => {
			vi.spyOn(GithubTriggerHelpers, 'verifySignature').mockReturnValueOnce(false);

			const trigger = new GithubTrigger();
			const result = await trigger.webhook.call(mockThis);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockThis.getResponseObject).toHaveBeenCalled();
		});

		it('should process webhook when signature verification succeeds', async () => {
			vi.spyOn(GithubTriggerHelpers, 'verifySignature').mockReturnValueOnce(true);

			const trigger = new GithubTrigger();
			const result = await trigger.webhook.call(mockThis);

			expect(result).toHaveProperty('workflowData');
		});

		it('should return OK for ping events when signature verification succeeds', async () => {
			vi.spyOn(GithubTriggerHelpers, 'verifySignature').mockReturnValueOnce(true);
			mockThis.getBodyData.mockReturnValue({ hook_id: '123' });

			const trigger = new GithubTrigger();
			const result = await trigger.webhook.call(mockThis);

			expect(result).toEqual({ webhookResponse: 'OK' });
		});
	});
});
