import { mock } from 'vitest-mock-extended';
import type { INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

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
			it('adopts the live subscription ids and returns true when a secret is stored', async () => {
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
					{
						id: 'sub1',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
				]);

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				const staticData: Record<string, unknown> = {
					subscriptionIds: ['old'],
					webhookSecret: 'secret',
				};
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'event') return 'newChat';
					return false;
				});

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);
				expect(result).toBe(true);
				expect(staticData.subscriptionIds).toEqual(['sub1']);
				expect(microsoftApiRequest.call).not.toHaveBeenCalled();
			});
			// Graph does not return clientState on a list, so a subscription whose secret
			// this node no longer holds can never be verified against.
			it('should not reuse a subscription when no secret is stored', async () => {
				const staticData: Record<string, unknown> = { subscriptionIds: ['sub1'] };
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
					{
						id: 'sub1',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
				]);
				(microsoftApiRequest.call as Mock).mockResolvedValue({});

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'event') return 'newChat';
					return false;
				});

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);

				expect(result).toBe(false);
				expect(microsoftApiRequest.call).toHaveBeenCalledWith(
					expect.anything(),
					'DELETE',
					'/v1.0/subscriptions/sub1',
				);
				expect(staticData.subscriptionIds).toBeUndefined();
			});

			// Graph accepts a second subscription on most of these resources, so a
			// failed delete must not stop the activation from being retried.
			it('should still decline when the stale subscription cannot be removed', async () => {
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
					{
						id: 'sub1',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
				]);
				(microsoftApiRequest.call as Mock).mockRejectedValue({ httpStatusCode: 500 });

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});
				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'event') return 'newChat';
					return false;
				});
				mockWebhookFunctions.getWorkflow.mockReturnValue({ id: 'wf1' });
				mockWebhookFunctions.getNode.mockReturnValue({ name: 'Microsoft Teams Trigger' });
				mockWebhookFunctions.logger = { warn: vi.fn() };

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);

				expect(result).toBe(false);
				expect(mockWebhookFunctions.logger.warn).toHaveBeenCalled();
			});
			// create() overwrites subscriptionIds, so an id Graph still holds has to
			// outlive checkExists or nothing is left to delete it by.
			it('should keep a stale subscription id when it cannot be removed', async () => {
				const staticData: Record<string, unknown> = {};
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
					{
						id: 'sub1',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
				]);
				(microsoftApiRequest.call as Mock).mockRejectedValue(new Error('Graph is unreachable'));

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) =>
					paramName === 'event' ? 'newChat' : false,
				);
				mockWebhookFunctions.getWorkflow.mockReturnValue({ id: 'wf1' });
				mockWebhookFunctions.getNode.mockReturnValue({ name: 'Microsoft Teams Trigger' });
				mockWebhookFunctions.logger = { warn: vi.fn() };

				await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);

				expect(staticData.staleSubscriptionIds).toEqual(['sub1']);
			});

			it('should forget a stale id once the subscription is removed', async () => {
				const staticData: Record<string, unknown> = { staleSubscriptionIds: ['earlier-sub'] };
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
					{
						id: 'sub1',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
				]);
				(microsoftApiRequest.call as Mock).mockResolvedValue({});

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) =>
					paramName === 'event' ? 'newChat' : false,
				);

				await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);

				expect(staticData.staleSubscriptionIds).toBeUndefined();
			});

			// Declining is not enough on its own: create() mints a fresh clientState,
			// so anything left on this URL keeps delivering with a secret we can no
			// longer verify.
			it('should delete a live subscription on another resource and clear both keys', async () => {
				const staticData: Record<string, unknown> = {
					subscriptionIds: ['sub-other'],
					webhookSecret: 'stored-secret',
				};
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
					{
						id: 'sub-other',
						notificationUrl: 'https://webhook.url',
						resource: '/teams/t1/channels/c1/messages',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
				]);
				(microsoftApiRequest.call as Mock).mockResolvedValue({});

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) =>
					paramName === 'event' ? 'newChat' : false,
				);

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);

				expect(result).toBe(false);
				expect(microsoftApiRequest.call).toHaveBeenCalledWith(
					expect.anything(),
					'DELETE',
					'/v1.0/subscriptions/sub-other',
				);
				expect(staticData.subscriptionIds).toBeUndefined();
				expect(staticData.webhookSecret).toBeUndefined();
			});

			it.each([{}, { webhookSecret: '' }])(
				'removes every own subscription and returns false when no secret is stored (%j)',
				async (staticData) => {
					(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
						{
							id: 'sub1',
							notificationUrl: 'https://webhook.url',
							resource: '/me/chats',
							expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
						},
						{
							id: 'sub2',
							notificationUrl: 'https://webhook.url',
							resource: '/me/chats',
							expirationDateTime: new Date(Date.now() - 3600000).toISOString(),
						},
						{
							id: 'subX',
							notificationUrl: 'https://other.url',
							resource: '/me/chats',
							expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
						},
					]);
					(microsoftApiRequest.call as Mock).mockResolvedValue({});
					mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
					mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

					const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
						mockWebhookFunctions,
					);

					expect(result).toBe(false);
					expect(
						(microsoftApiRequest.call as Mock).mock.calls.map((call) => call.slice(1, 3)),
					).toEqual([
						['DELETE', '/v1.0/subscriptions/sub1'],
						['DELETE', '/v1.0/subscriptions/sub2'],
					]);
					expect(staticData).not.toHaveProperty('subscriptionIds');
				},
			);

			it('warns per failed removal and still returns false when no secret is stored', async () => {
				const ctx: any = mock({ logger: { warn: vi.fn(), debug: vi.fn() } });
				ctx.getWorkflow.mockReturnValue({ id: 'wf1' });
				ctx.getNode.mockReturnValue({ name: 'Microsoft Teams Trigger' });
				ctx.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				ctx.getWorkflowStaticData.mockReturnValue({});
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
					{ id: 'sub1', notificationUrl: 'https://webhook.url', resource: '/me/chats' },
					{ id: 'sub2', notificationUrl: 'https://webhook.url', resource: '/me/chats' },
				]);
				(microsoftApiRequest.call as Mock).mockRejectedValue(
					new NodeApiError(ctx.getNode(), { message: 'Forbidden', httpCode: '403' }),
				);

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					ctx,
				);

				expect(result).toBe(false);
				expect(
					(microsoftApiRequest.call as Mock).mock.calls.map((call) => call.slice(1, 3)),
				).toEqual([
					['DELETE', '/v1.0/subscriptions/sub1'],
					['DELETE', '/v1.0/subscriptions/sub2'],
				]);
				expect(ctx.logger.warn).toHaveBeenCalledTimes(2);
				expect(ctx.logger.warn).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: failed to remove a stale subscription',
					expect.objectContaining({ subscriptionId: 'sub2', error: expect.any(String) }),
				);
			});

			it('removes an expiring own subscription and adopts the live one when a secret is stored', async () => {
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
					{
						id: 'sub1',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
					{
						id: 'sub2',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
					},
				]);
				(microsoftApiRequest.call as Mock).mockResolvedValue({});
				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				const staticData: Record<string, unknown> = { webhookSecret: 'secret' };
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) =>
					paramName === 'event' ? 'newChat' : false,
				);

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);

				expect(result).toBe(true);
				expect(
					(microsoftApiRequest.call as Mock).mock.calls.map((call) => call.slice(1, 3)),
				).toEqual([['DELETE', '/v1.0/subscriptions/sub2']]);
				expect(staticData).toEqual({ webhookSecret: 'secret', subscriptionIds: ['sub1'] });
			});

			it('removes an expiring own subscription and returns false when nothing else covers the resource', async () => {
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([
					{
						id: 'sub1',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
					},
				]);
				(microsoftApiRequest.call as Mock).mockResolvedValue({});
				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				const staticData: Record<string, unknown> = { webhookSecret: 'secret' };
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) =>
					paramName === 'event' ? 'newChat' : false,
				);

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);

				expect(result).toBe(false);
				expect(
					(microsoftApiRequest.call as Mock).mock.calls.map((call) => call.slice(1, 3)),
				).toEqual([['DELETE', '/v1.0/subscriptions/sub1']]);
				expect(staticData).toEqual({});
			});

			it('returns false when no subscription exists', async () => {
				(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([]);
				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				const staticData: Record<string, unknown> = { webhookSecret: 'secret' };
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) =>
					paramName === 'event' ? 'newChat' : false,
				);

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);

				expect(result).toBe(false);
				expect(microsoftApiRequest.call).not.toHaveBeenCalled();
				expect(staticData).toEqual({});
			});

			it('returns false when the listing fails', async () => {
				(microsoftApiRequestAllItems.call as Mock).mockRejectedValue(
					new Error('API request failed'),
				);
				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({ webhookSecret: 'secret' });

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);

				expect(result).toBe(false);
				expect(microsoftApiRequest.call).not.toHaveBeenCalled();
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

			it('should remove a stale subscription left behind by a failed activation', async () => {
				const mockWebhookData: Record<string, unknown> = { staleSubscriptionIds: ['stale1'] };

				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(mockWebhookData);
				(microsoftApiRequest.call as Mock).mockResolvedValue({});

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(
					mockWebhookFunctions,
				);

				expect(result).toBe(true);
				expect(microsoftApiRequest.call).toHaveBeenCalledWith(
					mockWebhookFunctions,
					'DELETE',
					'/v1.0/subscriptions/stale1',
				);
				expect(mockWebhookData.staleSubscriptionIds).toBeUndefined();
			});

			it('should ask Graph once for an id held as both current and stale', async () => {
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
					subscriptionIds: ['sub1'],
					staleSubscriptionIds: ['sub1', 'stale1'],
				});
				(microsoftApiRequest.call as Mock).mockResolvedValue({});

				await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(mockWebhookFunctions);

				expect((microsoftApiRequest.call as Mock).mock.calls).toHaveLength(2);
			});

			it('treats a 404 as already removed and still cleans the static data', async () => {
				const mockWebhookData: Record<string, unknown> = {
					subscriptionIds: ['gone'],
					webhookSecret: 'stored-secret',
				};
				const node = mock<INode>({ name: 'Microsoft Teams Trigger' });
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(mockWebhookData);
				(microsoftApiRequest.call as Mock).mockRejectedValue(
					new NodeApiError(node, { message: 'Not found', httpCode: '404' }),
				);

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(
					mockWebhookFunctions,
				);

				expect(result).toBe(true);
				expect(mockWebhookData).toEqual({});
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

			// Static data is flat; a nested `node` key returns at the guard and never
			// reaches the request, so the rejection below would go unexercised.
			it('should keep the stored ids when Graph rejects the delete', async () => {
				const staticData: Record<string, unknown> = {
					subscriptionIds: ['subscription123'],
					webhookSecret: 'stored-secret',
				};
				(microsoftApiRequest.call as Mock).mockRejectedValue(
					new NodeApiError(
						mockWebhookFunctions.getNode(),
						{ message: 'Graph is unavailable' },
						{ httpCode: '500' },
					),
				);
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(
					mockWebhookFunctions,
				);

				expect(result).toBe(false);
				// Without this the test would also pass if delete() never reached Graph.
				expect(microsoftApiRequest.call).toHaveBeenCalledWith(
					expect.anything(),
					'DELETE',
					'/v1.0/subscriptions/subscription123',
				);
				// Nothing was removed on Graph, so the ids must survive for the next attempt.
				expect(staticData.subscriptionIds).toEqual(['subscription123']);
				expect(staticData.webhookSecret).toBe('stored-secret');
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
					value: [{ clientState: 'stored-secret', resourceData: { message: 'test message' } }],
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
				webhookSecret: 'stored-secret',
			});

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(result.workflowData).toEqual([
				[
					{
						json: { message: 'test message' },
					},
				],
			]);
			expect(mockResponse.end).not.toHaveBeenCalled();
			expect(result.noWebhookResponse).toBeUndefined();
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

		it('should reject notifications when no secret is stored', async () => {
			const mockRequest = {
				body: {
					value: [{ clientState: 'anything', resourceData: { id: '1' } }],
				},
				query: {},
			};
			const mockResponse = {
				status: vi.fn().mockReturnThis(),
				send: vi.fn().mockReturnThis(),
				end: vi.fn(),
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(result.noWebhookResponse).toBe(true);
			expect(result.workflowData).toBeUndefined();
		});
	});

	describe('webhook: lifecycle notifications', () => {
		const NOW = Date.parse('2026-10-16T10:00:00.000Z');
		const expectedExpiry = new Date(NOW + 4318 * 60 * 1000).toISOString();

		const lifecycleItem = (lifecycleEvent: string, subscriptionId: unknown = 'sub1') => ({
			subscriptionId,
			subscriptionExpirationDateTime: new Date(NOW + 10 * 60 * 1000).toISOString(),
			tenantId: 't1',
			clientState: 'secret',
			lifecycleEvent,
		});

		const arrange = ({
			value,
			staticData = { subscriptionIds: ['sub1'], webhookSecret: 'secret' },
			params = { event: 'newChat' },
			mode = 'webhook',
		}: {
			value: unknown[];
			staticData?: Record<string, unknown>;
			params?: Record<string, unknown>;
			mode?: 'webhook' | 'manual';
		}) => {
			const res = {
				status: vi.fn().mockReturnThis(),
				send: vi.fn().mockReturnThis(),
				end: vi.fn(),
			};
			const ctx: any = mock({ logger: { warn: vi.fn(), debug: vi.fn() } });
			ctx.getRequestObject.mockReturnValue({ body: { value }, query: {} });
			ctx.getResponseObject.mockReturnValue(res);
			ctx.getWorkflowStaticData.mockReturnValue(staticData);
			ctx.getNode.mockReturnValue({ name: 'Microsoft Teams Trigger' });
			ctx.getWorkflow.mockReturnValue({ id: 'wf1' });
			ctx.getMode.mockReturnValue(mode);
			ctx.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
			ctx.getNodeParameter.mockImplementation((name: string, fallback?: unknown) =>
				name in params ? params[name] : fallback,
			);
			return { ctx, res, staticData };
		};

		const webhook = async (ctx: any) => await new MicrosoftTeamsTrigger().webhook.call(ctx);

		beforeEach(() => {
			vi.useFakeTimers({ toFake: ['Date'], now: NOW });
			(microsoftApiRequest.call as Mock).mockResolvedValue({});
			(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([]);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('renews a stored subscription on reauthorizationRequired', async () => {
			const { ctx, res, staticData } = arrange({
				value: [lifecycleItem('reauthorizationRequired')],
			});

			const result = await webhook(ctx);

			expect(microsoftApiRequest.call).toHaveBeenCalledWith(
				ctx,
				'PATCH',
				'/v1.0/subscriptions/sub1',
				{ expirationDateTime: expectedExpiry },
			);
			expect(res.status).toHaveBeenCalledTimes(1);
			expect(res.status).toHaveBeenCalledWith(202);
			expect(res.end).toHaveBeenCalledTimes(1);
			expect(result).toEqual({ noWebhookResponse: true });
			expect(staticData).toEqual({ subscriptionIds: ['sub1'], webhookSecret: 'secret' });
			expect(microsoftApiRequestAllItems.call).not.toHaveBeenCalled();
		});

		it('acks with 202 before the first Graph call and waits for the renewal', async () => {
			const { ctx, res } = arrange({ value: [lifecycleItem('reauthorizationRequired')] });
			const order: string[] = [];
			res.end.mockImplementation(() => order.push('ack'));
			let resolvePatch: (value: unknown) => void = () => {};
			(microsoftApiRequest.call as Mock).mockImplementation(async () => {
				order.push('patch');
				return await new Promise((resolve) => {
					resolvePatch = resolve;
				});
			});

			let settled = false;
			const pending = webhook(ctx).then((result) => {
				settled = true;
				return result;
			});
			await vi.waitFor(() => expect(order).toContain('patch'));
			await new Promise((resolve) => setImmediate(resolve));
			expect(order).toEqual(['ack', 'patch']);
			expect(settled).toBe(false);

			resolvePatch({});
			const result = await pending;

			expect(settled).toBe(true);
			expect(result).toEqual({ noWebhookResponse: true });
			expect(ctx.logger.warn).not.toHaveBeenCalled();
		});

		it('rejects a lifecycle notification when no secret is stored', async () => {
			const { ctx, res, staticData } = arrange({
				value: [{ ...lifecycleItem('subscriptionRemoved'), clientState: 'anything' }],
				staticData: { subscriptionIds: ['sub1'] },
			});

			const result = await webhook(ctx);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.status).not.toHaveBeenCalledWith(202);
			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
			expect(microsoftApiRequestAllItems.call).not.toHaveBeenCalled();
			expect(ctx.logger.warn).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
			expect(staticData).toEqual({ subscriptionIds: ['sub1'] });
		});

		it('acks and ignores a lifecycle item without a subscription id and starts no execution', async () => {
			const { ctx, res } = arrange({
				value: [
					lifecycleItem('subscriptionRemoved', 42),
					{ ...lifecycleItem('reauthorizationRequired'), subscriptionId: undefined },
				],
			});

			const result = await webhook(ctx);

			expect(res.status).toHaveBeenCalledWith(202);
			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
			expect(microsoftApiRequestAllItems.call).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
			expect(ctx.logger.debug).toHaveBeenCalledWith(
				'Microsoft Teams Trigger: ignored lifecycle event without a subscription id',
				expect.objectContaining({ lifecycleEvent: 'subscriptionRemoved' }),
			);
		});

		it.each([
			['a subscriptionRemoved notification', 'subscriptionRemoved'],
			['a renewal that Graph answers with 404', 'reauthorizationRequired'],
		])('re-creates the missing subscription after %s', async (_label, lifecycleEvent) => {
			const { ctx, res, staticData } = arrange({ value: [lifecycleItem(lifecycleEvent)] });
			(microsoftApiRequest.call as Mock).mockImplementation(
				async (_ctx: unknown, method: string) => {
					if (method === 'PATCH') {
						throw new NodeApiError(ctx.getNode(), { message: 'Not found', httpCode: '404' });
					}
					return { id: 'sub2' };
				},
			);

			const result = await webhook(ctx);

			expect(microsoftApiRequestAllItems.call).toHaveBeenCalledTimes(1);
			expect(microsoftApiRequest.call).toHaveBeenCalledWith(
				ctx,
				'POST',
				'/v1.0/subscriptions',
				expect.objectContaining({ resource: '/me/chats', expirationDateTime: expectedExpiry }),
			);
			expect(res.status).toHaveBeenCalledWith(202);
			expect(result).toEqual({ noWebhookResponse: true });
			expect(staticData.subscriptionIds).toEqual(['sub2']);
			expect(ctx.logger.warn).not.toHaveBeenCalled();
		});

		it('emits the change notifications of a mixed batch and handles the lifecycle item', async () => {
			const change = (id: string, message: string) => ({
				subscriptionId: 'sub1',
				clientState: 'secret',
				resourceData: { id, message },
			});
			const change1 = change('m1', 'first');
			const change2 = change('m2', 'second');
			const { ctx, res } = arrange({
				value: [change1, lifecycleItem('reauthorizationRequired'), change2],
			});

			const result = await webhook(ctx);

			expect(microsoftApiRequest.call).toHaveBeenCalledWith(
				ctx,
				'PATCH',
				'/v1.0/subscriptions/sub1',
				{ expirationDateTime: expectedExpiry },
			);
			expect(res.status).toHaveBeenCalledWith(202);
			expect(result).toEqual({
				noWebhookResponse: true,
				workflowData: [[{ json: change1.resourceData }], [{ json: change2.resourceData }]],
			});
		});

		it('warns and keeps going when a renewal fails with 403', async () => {
			const { ctx, res, staticData } = arrange({
				value: [
					lifecycleItem('reauthorizationRequired', 'sub1'),
					lifecycleItem('reauthorizationRequired', 'sub2'),
				],
				staticData: { subscriptionIds: ['sub1', 'sub2'], webhookSecret: 'secret' },
			});
			(microsoftApiRequest.call as Mock).mockImplementation(
				async (_ctx: unknown, _method: string, path: string) => {
					if (path === '/v1.0/subscriptions/sub1') {
						throw new NodeApiError(ctx.getNode(), { message: 'Forbidden', httpCode: '403' });
					}
					return {};
				},
			);

			await webhook(ctx);

			expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
			expect(ctx.logger.warn).toHaveBeenCalledWith(
				'Microsoft Teams Trigger: failed to renew subscription',
				expect.objectContaining({ subscriptionId: 'sub1' }),
			);
			expect(microsoftApiRequest.call).toHaveBeenCalledWith(
				ctx,
				'PATCH',
				'/v1.0/subscriptions/sub1',
				{ expirationDateTime: expectedExpiry },
			);
			expect(microsoftApiRequest.call).toHaveBeenCalledWith(
				ctx,
				'PATCH',
				'/v1.0/subscriptions/sub2',
				{ expirationDateTime: expectedExpiry },
			);
			expect(microsoftApiRequestAllItems.call).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(202);
			expect(staticData).toEqual({ subscriptionIds: ['sub1', 'sub2'], webhookSecret: 'secret' });
			expect(JSON.stringify(ctx.logger.warn.mock.calls)).not.toContain('secret');
		});

		it.each(['missed', 'somethingNew'])(
			'acks and ignores the %s lifecycle event',
			async (lifecycleEvent) => {
				const { ctx, res } = arrange({ value: [lifecycleItem(lifecycleEvent)] });

				const result = await webhook(ctx);

				expect(microsoftApiRequest.call).not.toHaveBeenCalled();
				expect(microsoftApiRequestAllItems.call).not.toHaveBeenCalled();
				expect(res.status).toHaveBeenCalledWith(202);
				expect(result).toEqual({ noWebhookResponse: true });
				expect(ctx.logger.debug).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: ignored lifecycle event',
					expect.objectContaining({ lifecycleEvent }),
				);
			},
		);

		it('rejects a lifecycle item whose clientState does not match the stored secret', async () => {
			const { ctx, res } = arrange({
				value: [{ ...lifecycleItem('reauthorizationRequired'), clientState: 'wrong' }],
			});

			const result = await webhook(ctx);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.status).not.toHaveBeenCalledWith(202);
			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
			expect(microsoftApiRequestAllItems.call).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('acks and ignores lifecycle items during a manual test run', async () => {
			const { ctx, res } = arrange({
				value: [lifecycleItem('reauthorizationRequired')],
				mode: 'manual',
			});

			const result = await webhook(ctx);

			expect(res.status).toHaveBeenCalledWith(202);
			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
			expect(microsoftApiRequestAllItems.call).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('emits the change notifications of a mixed batch during a manual test run', async () => {
			const change1 = {
				subscriptionId: 'sub1',
				clientState: 'secret',
				resourceData: { id: 'm1', message: 'first' },
			};
			const { ctx, res } = arrange({
				value: [change1, lifecycleItem('reauthorizationRequired')],
				mode: 'manual',
			});

			const result = await webhook(ctx);

			expect(res.status).toHaveBeenCalledWith(202);
			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
			expect(microsoftApiRequestAllItems.call).not.toHaveBeenCalled();
			expect(result).toEqual({
				noWebhookResponse: true,
				workflowData: [[{ json: change1.resourceData }]],
			});
		});
	});
});
