import { createHmac } from 'node:crypto';

import { createDeclarativeWebhook, WebhookContext } from 'n8n-core';
import { NodeApiError, NodeOperationError, Workflow } from 'n8n-workflow';
import type {
	DeclarativeWebhookCheckExists,
	DeclarativeWebhookDelete,
	IDeclarativeWebhookTrigger,
	INodeTypes,
	IWebhookData,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { GithubTrigger } from '../../GithubTrigger.node';
import * as GenericFunctions from '../../GenericFunctions';

const nodeType = new GithubTrigger();
const trigger = nodeType.description.trigger as IDeclarativeWebhookTrigger;
const createWebhook = trigger.lifecycle.create as (this: unknown) => Promise<boolean>;
const checkExistsConfig = trigger.lifecycle.checkExists as DeclarativeWebhookCheckExists;
const deleteConfig = trigger.lifecycle.delete as DeclarativeWebhookDelete;

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

/**
 * Resolves a lifecycle expression the way the declarative engine does, so the
 * resource locators in the hook URL are proven to unwrap to their values.
 */
const resolveExpression = (
	expression: string,
	extraKeys: Record<string, unknown> = { $staticData: { webhookId: '123456' } },
) => {
	const node = {
		id: 'n1',
		name: 'Github Trigger',
		type: 'n8n-nodes-base.githubTrigger',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {
			authentication: 'accessToken',
			owner: {
				__rl: true,
				mode: 'url',
				value: 'https://github.com/n8n-io',
				__regex: 'github.com/([-\\w]+)',
			},
			repository: { __rl: true, mode: 'name', value: 'n8n' },
			events: ['push'],
		},
	};
	const workflow = new Workflow({
		id: 'w1',
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes: {
			getByNameAndVersion: () => nodeType,
			getByName: () => nodeType,
			getKnownTypes: () => ({}),
		} as unknown as INodeTypes,
	});

	return workflow.expression.getSimpleParameterValue(
		node,
		expression,
		'internal',
		extraKeys as never,
	);
};

describe('GithubTrigger Node', () => {
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

			const result = await createWebhook.call(mockThis);

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

			await createWebhook.call(mockThis);

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

			const result = await createWebhook.call(mockThis);

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

			await createWebhook.call(mockThis);

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

			await createWebhook.call(mockThis);

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

			await expect(createWebhook.call(mockThis)).rejects.toThrow(
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

			await createWebhook.call(mockThis);

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

			const attempt = createWebhook.call(mockThis);

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

			await expect(createWebhook.call(mockThis)).rejects.toThrow(/refused to create the webhook/);
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

			await expect(createWebhook.call(mockThis)).rejects.toThrow(/refused to create the webhook/);
			expect(webhookData.webhookSecret).toBeUndefined();
			expect(apiRequestSpy).not.toHaveBeenCalledWith('PATCH', expect.anything(), expect.anything());
		});

		it('should reject a stored webhook that carries no config', async () => {
			withAdoptableWebhook();
			mockExistingWebhook({ id: 123, events: ['push'] });

			await expect(createWebhook.call(mockThis)).rejects.toThrow(/refused to create the webhook/);
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should treat a deleted stored webhook as someone else holding the URL', async () => {
			withAdoptableWebhook();
			mockExistingWebhook({ reject: { httpCode: '404' } });

			await expect(createWebhook.call(mockThis)).rejects.toThrow(/refused to create the webhook/);
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should propagate a failure to fetch the stored webhook unchanged', async () => {
			withAdoptableWebhook();
			mockExistingWebhook({ reject: { httpCode: '403', message: 'Forbidden' } });

			const attempt = createWebhook.call(mockThis);

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

			await expect(createWebhook.call(mockThis)).rejects.toMatchObject({
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

			await expect(createWebhook.call(mockThis)).rejects.toThrow('socket hang up');
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should not store a secret when Github reports the update was not applied', async () => {
			withAdoptableWebhook();
			mockExistingWebhook().mockResolvedValueOnce({ id: 123, active: false });

			await expect(createWebhook.call(mockThis)).rejects.toThrow(/did not apply the update/);
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should warn when a successful create strands the previously stored webhook', async () => {
			withAdoptableWebhook();
			vi.spyOn(GenericFunctions, 'githubApiRequest').mockResolvedValueOnce({
				id: 789,
				active: true,
			});

			await createWebhook.call(mockThis);

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

			await createWebhook.call(mockThis);

			expect(mockThis.logger.warn).not.toHaveBeenCalled();
		});

		it('should throw NodeOperationError if repo is not found (404)', async () => {
			vi.spyOn(GenericFunctions, 'githubApiRequest').mockRejectedValue({ httpCode: '404' });

			await expect(createWebhook.call(mockThis)).rejects.toThrow(NodeOperationError);

			await expect(createWebhook.call(mockThis)).rejects.toThrow(
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

			// checkExists reports it absent because no secret is stored; that half is
			// `requireKeys` now, asserted in "declarative lifecycle" below.
			const apiRequestSpy = vi.spyOn(GenericFunctions, 'githubApiRequest');

			apiRequestSpy
				.mockRejectedValueOnce({ httpCode: '422' })
				.mockResolvedValueOnce({
					id: 424242,
					events: ['push'],
					config: { url: 'https://example.com/webhook' },
				})
				.mockResolvedValueOnce({ id: 424242, active: true });

			expect(await createWebhook.call(mockThis)).toBe(true);

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

	describe('declarative lifecycle', () => {
		it('should treat a stored hook without a secret as absent, without calling the API', () => {
			// The old node short-circuited on a falsy secret so a pre-secret workflow
			// re-registers instead of serving 401s forever.
			expect(checkExistsConfig.requireKeys).toEqual(['webhookSecret']);
		});

		it('should clear every key it owns when the hook is gone or deleted', () => {
			// `create` is a function, so the engine cannot read the owned keys from a
			// `store` block and the node has to name them.
			expect(trigger.managedKeys).toEqual(['webhookId', 'webhookEvents', 'webhookSecret']);
			expect(checkExistsConfig.notFoundHttpCodes).toEqual([404]);
		});

		it('should address the stored hook, resolving both resource locators', () => {
			expect(checkExistsConfig.routing.request?.method).toBe('GET');
			expect(deleteConfig.routing.request?.method).toBe('DELETE');
			expect(deleteConfig.routing.request?.url).toBe(checkExistsConfig.routing.request?.url);

			expect(resolveExpression(checkExistsConfig.routing.request?.url as string)).toBe(
				'/repos/n8n-io/n8n/hooks/123456',
			);
		});
	});

	describe('delivery handler', () => {
		it('should verify the signature Github sends', () => {
			expect(trigger.handler?.verification).toEqual({
				algorithm: 'hmac-sha256',
				signatureHeader: 'x-hub-signature-256',
				secret: '={{ $staticData.webhookSecret }}',
				encoding: 'hex',
				prefix: 'sha256=',
				signedPayload: 'rawBody',
			});
		});

		it('should answer the ping without starting a workflow', () => {
			const ping = trigger.handler?.ping;
			expect(ping?.response).toBe('OK');

			const matches = (body: Record<string, unknown>) =>
				resolveExpression(ping?.when as string, { $request: { body } });

			// Same shape test the programmatic handler used: a hook_id with no action.
			expect(matches({ hook_id: '123' })).toBe(true);
			expect(matches({ hook_id: '123', action: 'opened' })).toBe(false);
			expect(matches({ action: 'opened' })).toBe(false);
		});

		it('should emit the classic trigger item shape', () => {
			expect(trigger.handler?.output).toEqual({ includeMeta: true });
		});

		it('should not filter events, matching the behaviour it replaces', () => {
			expect(trigger.handler?.filter).toBeUndefined();
		});
	});

	/**
	 * Drives the delivery handler the loader synthesizes, with real HMAC digests,
	 * so the signature contract is proven rather than described.
	 */
	describe('delivery handler, end to end', () => {
		const SECRET = 'test-secret';

		const deliver = ({
			body = { action: 'opened' },
			storeSecret = true,
			// `false` sends no signature header at all; a string signs with that secret.
			sign = SECRET as string | false,
		}: {
			body?: Record<string, unknown>;
			storeSecret?: boolean;
			sign?: string | false;
		} = {}) => {
			const node = {
				id: 'n1',
				name: 'Github Trigger',
				type: 'n8n-nodes-base.githubTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: { authentication: 'accessToken', events: ['push'] },
			};
			const workflow = new Workflow({
				id: 'w1',
				nodes: [node],
				connections: {},
				active: true,
				nodeTypes: {
					getByNameAndVersion: () => nodeType,
					getByName: () => nodeType,
					getKnownTypes: () => ({}),
				} as unknown as INodeTypes,
			});
			if (storeSecret) workflow.getStaticData('node', node).webhookSecret = SECRET;

			const rawBody = JSON.stringify(body);
			const headers: Record<string, string> = { 'x-github-event': 'pull_request' };
			if (sign !== false) {
				headers['x-hub-signature-256'] =
					'sha256=' + createHmac('sha256', sign).update(rawBody).digest('hex');
			}

			const additionalData = mock<IWorkflowExecuteAdditionalData>({ executionId: 'e1' });
			additionalData.httpRequest = {
				body,
				headers,
				query: {},
				params: {},
				rawBody,
			} as unknown as IWorkflowExecuteAdditionalData['httpRequest'];
			const response = {
				statusCode: undefined as number | undefined,
				status(code: number) {
					this.statusCode = code;
					return this;
				},
				send() {
					return this;
				},
				end() {
					return this;
				},
			};
			additionalData.httpResponse =
				response as unknown as IWorkflowExecuteAdditionalData['httpResponse'];

			const context = new WebhookContext(
				workflow,
				node,
				additionalData,
				'webhook',
				{
					webhookDescription: { name: 'default', httpMethod: 'POST', path: 'webhook' },
				} as IWebhookData,
				[],
				null,
			);

			return {
				run: async () => await createDeclarativeWebhook(trigger).call(context),
				response,
			};
		};

		it('should emit body, headers and query for a correctly signed delivery', async () => {
			const { run } = deliver();

			const result = await run();

			expect(result.workflowData?.[0][0].json).toEqual({
				body: { action: 'opened' },
				headers: expect.objectContaining({ 'x-github-event': 'pull_request' }),
				query: {},
			});
		});

		it('should answer 401 and start nothing when the signature was made with another secret', async () => {
			const { run, response } = deliver({ sign: 'wrong-secret' });

			expect(await run()).toEqual({ noWebhookResponse: true });
			expect(response.statusCode).toBe(401);
		});

		it('should answer 401 when the delivery carries no signature', async () => {
			const { run, response } = deliver({ sign: false });

			expect(await run()).toEqual({ noWebhookResponse: true });
			expect(response.statusCode).toBe(401);
		});

		it('should answer 401 while no secret is stored, rather than accept the delivery', async () => {
			const { run, response } = deliver({ storeSecret: false });

			expect(await run()).toEqual({ noWebhookResponse: true });
			expect(response.statusCode).toBe(401);
		});

		it('should return OK for a signed ping and start no workflow', async () => {
			const { run } = deliver({ body: { hook_id: 123, zen: 'Non-blocking is better.' } });

			expect(await run()).toEqual({ webhookResponse: 'OK' });
		});
	});
});
