import { NodeApiError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { MicrosoftTeamsTrigger } from '../../MicrosoftTeamsTrigger.node';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../v2/transport';
import type { Mock } from 'vitest';
import type * as _transport from '../../v2/transport';

// Preserve the real transport exports (the node description references
// SERVICE_PRINCIPAL_AUTH/SP_HIDE at construction, and getResourcePath uses the real
// credential resolver); only stub the network helpers.
vi.mock('../../v2/transport', async () => {
	const actual = await vi.importActual<typeof _transport>('../../v2/transport');
	return {
		...actual,
		microsoftApiRequest: {
			call: vi.fn(),
		},
		microsoftApiRequestAllItems: {
			call: vi.fn(),
		},
	};
});

describe('Microsoft Teams Trigger Node', () => {
	let mockWebhookFunctions: any;

	beforeEach(() => {
		mockWebhookFunctions = mock();
		vi.clearAllMocks();
	});

	describe('webhookMethods', () => {
		describe('checkExists', () => {
			it('should return true if the subscription exists', async () => {
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
					{
						id: 'sub1',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
				]);

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
					node: {
						subscriptionIds: ['sub1'],
					},
				});

				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'event') return 'newChat';
					return false;
				});

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);
				expect(result).toBe(true);
			});
			it('should return false if the subscription does not exist', async () => {
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([]);

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');

				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
					node: {},
				});

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);
				expect(result).toBe(false);
			});

			it('should throw an error if the API request fails', async () => {
				(microsoftApiRequestAllItems.call as Mock).mockRejectedValue(
					new Error('API request failed'),
				);

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
					node: {},
				});

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);
				expect(result).toBe(false);
			});
		});

		describe('create', () => {
			it('should create a subscription successfully', async () => {
				(microsoftApiRequest.call as Mock).mockResolvedValue({ id: 'subscription123' });

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getNodeParameter.mockReturnValue('newChat');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
					node: {
						subscriptionIds: [],
					},
				});

				(microsoftApiRequest.call as Mock).mockResolvedValue({
					value: [{ id: 'team1', displayName: 'Team 1' }],
				});

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.create.call(
					mockWebhookFunctions,
				);

				expect(result).toBe(true);
				expect(microsoftApiRequest.call).toHaveBeenCalledWith(
					mockWebhookFunctions,
					'POST',
					'/v1.0/subscriptions',
					expect.objectContaining({
						changeType: 'created',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: expect.any(String),
						latestSupportedTlsVersion: 'v1_2',
						lifecycleNotificationUrl: 'https://webhook.url',
						clientState: expect.any(String),
					}),
				);
			});

			it('should persist a clientState secret on the workflow static data', async () => {
				(microsoftApiRequest.call as Mock).mockResolvedValue({ id: 'subscription123' });

				const staticData: { subscriptionIds?: string[]; webhookSecret?: string } = {};
				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getNodeParameter.mockReturnValue('newChat');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

				await new MicrosoftTeamsTrigger().webhookMethods.default.create.call(mockWebhookFunctions);

				expect(typeof staticData.webhookSecret).toBe('string');
				expect((staticData.webhookSecret as string).length).toBeGreaterThan(0);

				const requestBody = (microsoftApiRequest.call as Mock).mock.calls[0][3] as Record<
					string,
					unknown
				>;
				expect(requestBody.clientState).toBe(staticData.webhookSecret);
			});

			it('should throw an error if the URL is invalid', async () => {
				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('invalid-url');
				await expect(
					new MicrosoftTeamsTrigger().webhookMethods.default.create.call(mockWebhookFunctions),
				).rejects.toThrow('Invalid Notification URL');
			});
		});

		describe('delete', () => {
			it('should delete subscriptions using stored IDs and clean static data', async () => {
				const mockWebhookData: {
					subscriptionIds?: string[];
					webhookSecret?: string;
				} = {
					subscriptionIds: ['subscription123'],
					webhookSecret: 'stored-secret',
				};

				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(mockWebhookData);

				(microsoftApiRequest.call as Mock).mockResolvedValue({});

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(
					mockWebhookFunctions,
				);
				expect(result).toBe(true);
				expect(microsoftApiRequest.call).toHaveBeenCalledWith(
					mockWebhookFunctions,
					'DELETE',
					'/v1.0/subscriptions/subscription123',
				);
				expect(mockWebhookData.subscriptionIds).toBeUndefined();
				expect(mockWebhookData.webhookSecret).toBeUndefined();
			});

			it('should return false if no subscription matches', async () => {
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([]);
				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
					node: {
						subscriptionIds: [],
					},
				});

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(
					mockWebhookFunctions,
				);
				expect(result).toBe(false);
			});

			it('should throw an error if the API request fails', async () => {
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
					{ id: 'subscription123', notificationUrl: 'https://webhook.url' },
				]);
				(microsoftApiRequest.call as Mock).mockRejectedValue(new Error('API request failed'));
				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
					node: {
						subscriptionIds: ['subscription123'],
					},
				});

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(
					mockWebhookFunctions,
				);
				expect(result).toBe(false);
			});
		});
	});

	describe('webhook', () => {
		it('should handle Microsoft Graph validation request correctly', async () => {
			const mockRequest = {
				query: {
					validationToken: 'validation-token',
				},
			};
			const mockResponse = {
				status: vi.fn().mockReturnThis(),
				type: vi.fn().mockReturnThis(),
				send: vi.fn(),
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.type).toHaveBeenCalledWith('text/plain');
			expect(mockResponse.send).toHaveBeenCalledWith('validation-token');
			expect(result.noWebhookResponse).toBe(true);
		});

		it('should process incoming event notifications', async () => {
			const mockRequest = {
				body: {
					value: [{ resourceData: { message: 'test message' } }],
				},
				query: {},
			};
			const mockResponse = {
				status: vi.fn().mockReturnThis(),
				send: vi.fn(),
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(result.workflowData).toEqual([
				[
					{
						json: { message: 'test message' },
					},
				],
			]);
		});

		it('should process notifications when stored secret matches clientState', async () => {
			const mockRequest = {
				body: {
					value: [
						{
							clientState: 'expected-secret',
							resourceData: { message: 'test message' },
						},
					],
				},
				query: {},
			};
			const mockResponse = {
				status: vi.fn().mockReturnThis(),
				send: vi.fn(),
				end: vi.fn(),
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(mockResponse.status).not.toHaveBeenCalledWith(401);
			expect(result.workflowData).toEqual([
				[
					{
						json: { message: 'test message' },
					},
				],
			]);
		});

		it('should return 401 when clientState does not match stored secret', async () => {
			const mockRequest = {
				body: {
					value: [{ clientState: 'wrong-secret-aa' }],
				},
				query: {},
			};
			const mockResponse = {
				status: vi.fn().mockReturnThis(),
				send: vi.fn().mockReturnThis(),
				end: vi.fn().mockReturnThis(),
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(result.noWebhookResponse).toBe(true);
			expect(result.workflowData).toBeUndefined();
		});

		it('should process notifications when no secret is stored (backward compatibility)', async () => {
			const mockRequest = {
				body: {
					value: [{ clientState: 'anything', resourceData: { id: '1' } }],
				},
				query: {},
			};
			const mockResponse = {
				status: vi.fn().mockReturnThis(),
				send: vi.fn(),
				end: vi.fn(),
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(mockResponse.status).not.toHaveBeenCalledWith(401);
			expect(result.workflowData).toEqual([[{ json: { id: '1' } }]]);
		});
	});
});

describe('Microsoft Teams Trigger subscription lifecycle', () => {
	const now = new Date('2026-10-16T00:00:00.000Z');
	const renewedUntil = '2026-10-18T23:58:00.000Z';
	const webhookUrl = 'https://n8n.example.com/webhook/abc/webhook';
	const channelResource = '/teams/team123/channels/channel123/messages';
	const node = {
		id: 'node1',
		name: 'Microsoft Teams Trigger',
		type: 'n8n-nodes-base.microsoftTeamsTrigger',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
	};

	let ctx: any;
	let staticData: Record<string, unknown>;
	let res: { status: Mock; send: Mock; end: Mock; type: Mock };

	const notFound = () =>
		new NodeApiError(node, { message: 'Subscription not found', statusCode: 404 });
	const forbidden = () => new NodeApiError(node, { message: 'Forbidden', statusCode: 403 });

	const lifecycle = (
		lifecycleEvent: string,
		subscriptionId = 'sub1',
		clientState: string | undefined = 'secret',
	) => ({
		subscriptionId,
		subscriptionExpirationDateTime: '2026-10-16T01:00:00.000Z',
		tenantId: 'tenant1',
		clientState,
		lifecycleEvent,
	});

	const message = (id: string, clientState = 'secret') => ({
		subscriptionId: 'sub1',
		subscriptionExpirationDateTime: '2026-10-18T00:00:00.000Z',
		changeType: 'created',
		resource: `${channelResource}('${id}')`,
		resourceData: { id, '@odata.type': '#Microsoft.Graph.chatMessage' },
		clientState,
		tenantId: 'tenant1',
	});

	const receive = (...value: object[]) =>
		ctx.getRequestObject.mockReturnValue({ query: {}, body: { value } });

	const calls = (method: string) =>
		(microsoftApiRequest.call as Mock).mock.calls.filter((call) => call[1] === method);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ now, toFake: ['Date'] });

		staticData = { subscriptionIds: ['sub1'], webhookSecret: 'secret' };
		res = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
			end: vi.fn().mockReturnThis(),
			type: vi.fn().mockReturnThis(),
		};

		ctx = mock();
		ctx.logger = { warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
		ctx.getNode.mockReturnValue(node);
		ctx.getResponseObject.mockReturnValue(res);
		ctx.getWorkflowStaticData.mockReturnValue(staticData);
		ctx.getNodeWebhookUrl.mockReturnValue(webhookUrl);
		ctx.getNodeParameter.mockImplementation((name: string, fallback?: unknown) => {
			const params: Record<string, unknown> = {
				event: 'newChannelMessage',
				teamId: 'team123',
				channelId: 'channel123',
			};
			return name in params ? params[name] : fallback;
		});
		(microsoftApiRequest.call as Mock).mockResolvedValue({});
		(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([]);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('webhook', () => {
		it('renews the subscription when Graph sends reauthorizationRequired', async () => {
			receive(lifecycle('reauthorizationRequired'));

			const result = await new MicrosoftTeamsTrigger().webhook.call(ctx);

			expect(microsoftApiRequest.call).toHaveBeenCalledTimes(1);
			expect(microsoftApiRequest.call).toHaveBeenCalledWith(
				ctx,
				'PATCH',
				'/v1.0/subscriptions/sub1',
				{ expirationDateTime: renewedUntil },
			);
			expect(res.status).toHaveBeenCalledWith(202);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('does not pass lifecycle notifications to the workflow', async () => {
			receive(
				lifecycle('reauthorizationRequired'),
				lifecycle('missed'),
				lifecycle('subscriptionRemoved', 'sub2'),
			);

			const result = await new MicrosoftTeamsTrigger().webhook.call(ctx);

			expect(result.workflowData).toBeUndefined();
		});

		it('renews a subscription once when Graph repeats the challenge in one batch', async () => {
			receive(lifecycle('reauthorizationRequired'), lifecycle('reauthorizationRequired'));

			await new MicrosoftTeamsTrigger().webhook.call(ctx);

			expect(calls('PATCH')).toHaveLength(1);
		});

		it('renews every subscription named in the batch', async () => {
			staticData.subscriptionIds = ['sub1', 'sub2'];
			receive(lifecycle('reauthorizationRequired'), lifecycle('reauthorizationRequired', 'sub2'));

			await new MicrosoftTeamsTrigger().webhook.call(ctx);

			expect(calls('PATCH').map((call) => call[2])).toEqual([
				'/v1.0/subscriptions/sub1',
				'/v1.0/subscriptions/sub2',
			]);
		});

		it('acknowledges missed notifications without calling Graph', async () => {
			receive(lifecycle('missed'));

			const result = await new MicrosoftTeamsTrigger().webhook.call(ctx);

			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
			expect(microsoftApiRequestAllItems.call).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(202);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('ignores lifecycle notifications for subscriptions it does not own', async () => {
			receive(lifecycle('reauthorizationRequired', '../../me/messages'));

			const result = await new MicrosoftTeamsTrigger().webhook.call(ctx);

			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(202);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('rejects lifecycle notifications with a wrong clientState', async () => {
			receive(lifecycle('reauthorizationRequired', 'sub1', 'wrong-secret'));

			const result = await new MicrosoftTeamsTrigger().webhook.call(ctx);

			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(401);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('recreates the subscription when Graph sends subscriptionRemoved', async () => {
			receive(lifecycle('subscriptionRemoved'));
			(microsoftApiRequest.call as Mock).mockResolvedValue({ id: 'sub-new' });

			const result = await new MicrosoftTeamsTrigger().webhook.call(ctx);

			expect(calls('PATCH')).toHaveLength(0);
			expect(calls('POST')).toEqual([
				[
					ctx,
					'POST',
					'/v1.0/subscriptions',
					expect.objectContaining({
						resource: channelResource,
						notificationUrl: webhookUrl,
						lifecycleNotificationUrl: webhookUrl,
						clientState: 'secret',
						expirationDateTime: renewedUntil,
					}),
				],
			]);
			expect(staticData.subscriptionIds).toEqual(['sub-new']);
			expect(staticData.webhookSecret).toBe('secret');
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('recreates the subscription when the renewal finds it gone', async () => {
			receive(lifecycle('reauthorizationRequired'));
			(microsoftApiRequest.call as Mock).mockImplementation(async (_ctx, method: string) => {
				if (method === 'PATCH') throw notFound();
				return { id: 'sub-new' };
			});

			const result = await new MicrosoftTeamsTrigger().webhook.call(ctx);

			expect(calls('PATCH')).toHaveLength(1);
			expect(calls('POST')).toHaveLength(1);
			expect(staticData.subscriptionIds).toEqual(['sub-new']);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('keeps the other subscriptions and only recreates the removed one', async () => {
			staticData.subscriptionIds = ['sub1', 'sub2'];
			ctx.getNodeParameter.mockImplementation((name: string, fallback?: unknown) => {
				const params: Record<string, unknown> = {
					event: 'newChannelMessage',
					teamId: 'team123',
					watchAllChannels: true,
				};
				return name in params ? params[name] : fallback;
			});
			(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
				{
					id: 'sub1',
					notificationUrl: webhookUrl,
					resource: '/teams/team123/channels/channelA/messages',
					expirationDateTime: '2026-10-17T00:00:00.000Z',
				},
				{
					id: 'sub2',
					notificationUrl: webhookUrl,
					resource: '/teams/team123/channels/channelB/messages',
					expirationDateTime: '2026-10-17T00:00:00.000Z',
				},
				{
					id: 'other',
					notificationUrl: 'https://elsewhere.example.com/webhook',
					resource: '/teams/team123/channels/channelB/messages',
					expirationDateTime: '2026-10-17T00:00:00.000Z',
				},
			]);
			(microsoftApiRequest.call as Mock).mockImplementation(
				async (_ctx, method: string, resource: string) => {
					if (method === 'GET' && resource.endsWith('/channels')) {
						return { value: [{ id: 'channelA' }, { id: 'channelB' }] };
					}
					return { id: 'sub2-new' };
				},
			);
			receive(lifecycle('subscriptionRemoved', 'sub2'));

			await new MicrosoftTeamsTrigger().webhook.call(ctx);

			expect(calls('POST')).toHaveLength(1);
			expect(calls('POST')[0][3]).toEqual(
				expect.objectContaining({ resource: '/teams/team123/channels/channelB/messages' }),
			);
			expect(staticData.subscriptionIds).toEqual(['sub1', 'sub2-new']);
		});

		it('recreates the subscription without a clientState when none is stored', async () => {
			staticData = { subscriptionIds: ['sub1'] };
			ctx.getWorkflowStaticData.mockReturnValue(staticData);
			receive(lifecycle('subscriptionRemoved', 'sub1', undefined));
			(microsoftApiRequest.call as Mock).mockResolvedValue({ id: 'sub-new' });

			await new MicrosoftTeamsTrigger().webhook.call(ctx);

			expect(calls('POST')[0][3]).not.toHaveProperty('clientState');
			expect(staticData.webhookSecret).toBeUndefined();
			expect(staticData.subscriptionIds).toEqual(['sub-new']);
		});

		it('fails the execution when the renewal fails', async () => {
			receive(lifecycle('reauthorizationRequired'));
			(microsoftApiRequest.call as Mock).mockRejectedValue(forbidden());

			await expect(new MicrosoftTeamsTrigger().webhook.call(ctx)).rejects.toThrow(
				'Could not renew the Microsoft Teams subscription',
			);
			expect(res.status).not.toHaveBeenCalled();
			expect(staticData.subscriptionIds).toEqual(['sub1']);
		});

		it('fails the execution when the subscription cannot be recreated', async () => {
			receive(lifecycle('subscriptionRemoved'));
			(microsoftApiRequest.call as Mock).mockRejectedValue(forbidden());

			await expect(new MicrosoftTeamsTrigger().webhook.call(ctx)).rejects.toThrow(
				'Could not renew the Microsoft Teams subscription',
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('still delivers messages when a renewal in the same batch fails', async () => {
			receive(message('m1'), lifecycle('reauthorizationRequired'), message('m2'));
			(microsoftApiRequest.call as Mock).mockRejectedValue(forbidden());

			const result = await new MicrosoftTeamsTrigger().webhook.call(ctx);

			expect(result.workflowData).toEqual([
				[{ json: expect.objectContaining({ id: 'm1' }) }],
				[{ json: expect.objectContaining({ id: 'm2' }) }],
			]);
			expect(ctx.logger.error).toHaveBeenCalledWith(
				'Could not renew the Microsoft Teams subscription',
				expect.objectContaining({ error: expect.any(Error) }),
			);
			expect(res.status).not.toHaveBeenCalled();
		});

		it('renews and delivers messages from the same batch', async () => {
			receive(lifecycle('reauthorizationRequired'), message('m1'));

			const result = await new MicrosoftTeamsTrigger().webhook.call(ctx);

			expect(calls('PATCH')).toHaveLength(1);
			expect(result.workflowData).toEqual([[{ json: expect.objectContaining({ id: 'm1' }) }]]);
		});

		it('keeps delivering messages after a renewal', async () => {
			const trigger = new MicrosoftTeamsTrigger();

			receive(lifecycle('reauthorizationRequired'));
			await trigger.webhook.call(ctx);

			vi.clearAllMocks();
			receive(message('m3'));
			const result = await trigger.webhook.call(ctx);

			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
			expect(result.workflowData).toEqual([[{ json: expect.objectContaining({ id: 'm3' }) }]]);
		});
	});

	describe('checkExists', () => {
		const active = (id: string, resource = channelResource) => ({
			id,
			notificationUrl: webhookUrl,
			resource,
			expirationDateTime: '2026-10-16T00:30:00.000Z',
		});

		it('renews the active subscriptions on activation', async () => {
			(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([active('sub1')]);

			const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(ctx);

			expect(result).toBe(true);
			expect(staticData.subscriptionIds).toEqual(['sub1']);
			expect(microsoftApiRequest.call).toHaveBeenCalledWith(
				ctx,
				'PATCH',
				'/v1.0/subscriptions/sub1',
				{ expirationDateTime: renewedUntil },
			);
		});

		it('keeps an active subscription when its renewal fails', async () => {
			(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([active('sub1')]);
			(microsoftApiRequest.call as Mock).mockRejectedValue(forbidden());

			const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(ctx);

			expect(result).toBe(true);
			expect(staticData.subscriptionIds).toEqual(['sub1']);
			expect(ctx.logger.warn).toHaveBeenCalledWith(
				'Could not renew the Microsoft Teams subscription',
				expect.objectContaining({ error: expect.any(Error) }),
			);
		});

		it('ignores subscriptions that expire within five minutes', async () => {
			(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
				{ ...active('sub1'), expirationDateTime: '2026-10-16T00:04:00.000Z' },
			]);

			const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(ctx);

			expect(result).toBe(false);
			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
		});

		it('does not renew anything when a resource has no subscription', async () => {
			(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
				active('sub1', '/teams/team123/channels/other/messages'),
			]);

			const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(ctx);

			expect(result).toBe(false);
			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
		});
	});

	describe('create', () => {
		it('creates one subscription per resource and stores their ids', async () => {
			ctx.getNodeParameter.mockImplementation((name: string, fallback?: unknown) =>
				name === 'event' ? 'newTeamMember' : name === 'watchAllTeams' ? true : fallback,
			);
			(microsoftApiRequest.call as Mock).mockImplementation(
				async (_ctx, method: string, _resource: string, body: { resource?: string }) => {
					if (method === 'GET') return { value: [{ id: 'team1' }, { id: 'team2' }] };
					return { id: `sub-${body.resource}` };
				},
			);

			const result = await new MicrosoftTeamsTrigger().webhookMethods.default.create.call(ctx);

			expect(result).toBe(true);
			expect(staticData.subscriptionIds).toEqual([
				'sub-/teams/team1/members',
				'sub-/teams/team2/members',
			]);
			expect(calls('POST').map((call) => call[3].expirationDateTime)).toEqual([
				renewedUntil,
				renewedUntil,
			]);
		});
	});

	describe('delete', () => {
		it('treats a subscription that already expired as deleted', async () => {
			(microsoftApiRequest.call as Mock).mockRejectedValue(notFound());

			const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(ctx);

			expect(result).toBe(true);
			expect(staticData.subscriptionIds).toBeUndefined();
			expect(staticData.webhookSecret).toBeUndefined();
		});

		it('keeps the stored state when the deletion fails for another reason', async () => {
			(microsoftApiRequest.call as Mock).mockRejectedValue(forbidden());

			const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(ctx);

			expect(result).toBe(false);
			expect(staticData.subscriptionIds).toEqual(['sub1']);
		});
	});
});
