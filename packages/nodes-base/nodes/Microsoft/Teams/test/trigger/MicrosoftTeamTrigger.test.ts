import { mock } from 'jest-mock-extended';
import { NodeApiError } from 'n8n-workflow';

import { MicrosoftTeamsTrigger } from '../../MicrosoftTeamsTrigger.node';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../v2/transport';

jest.mock('../../v2/transport', () => ({
	microsoftApiRequest: {
		call: jest.fn(),
	},
	microsoftApiRequestAllItems: {
		call: jest.fn(),
	},
}));

describe('Microsoft Teams Trigger Node', () => {
	let mockWebhookFunctions: any;

	beforeEach(() => {
		mockWebhookFunctions = mock();
		jest.clearAllMocks();
	});

	describe('webhookMethods', () => {
		describe('checkExists', () => {
			it('should return true if the subscription exists', async () => {
				(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValue([
					{
						id: 'sub1',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
				]);

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
					subscriptionIds: ['sub1'],
					webhookSecret: 'stored-secret',
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

			// Graph does not return clientState on a list, so a subscription whose secret
			// this node no longer holds can never be verified against.
			it('should not reuse a subscription when no secret is stored', async () => {
				const staticData: Record<string, unknown> = { subscriptionIds: ['sub1'] };
				(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValue([
					{
						id: 'sub1',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
				]);
				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({});

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
					mockWebhookFunctions,
					'DELETE',
					'/v1.0/subscriptions/sub1',
				);
				expect(staticData.subscriptionIds).toBeUndefined();
			});

			// Graph accepts a second subscription on most of these resources, so a
			// failed delete must not stop the activation from being retried.
			it('should still decline when the stale subscription cannot be removed', async () => {
				(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValue([
					{
						id: 'sub1',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
				]);
				(microsoftApiRequest.call as jest.Mock).mockRejectedValue({ httpStatusCode: 500 });

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});
				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) =>
					paramName === 'event' ? 'newChat' : false,
				);
				mockWebhookFunctions.logger = { warn: jest.fn() };

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
				(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValue([
					{
						id: 'sub1',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
				]);
				(microsoftApiRequest.call as jest.Mock).mockRejectedValue(
					new Error('Graph is unreachable'),
				);

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) =>
					paramName === 'event' ? 'newChat' : false,
				);
				mockWebhookFunctions.logger = { warn: jest.fn() };

				await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);

				expect(staticData.staleSubscriptionIds).toEqual(['sub1']);
			});

			it('should forget a stale id once the subscription is removed', async () => {
				const staticData: Record<string, unknown> = { staleSubscriptionIds: ['earlier-sub'] };
				(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValue([
					{
						id: 'sub1',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
				]);
				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({});

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

			// The cleanup covers every subscription on this URL, not only the ones
			// that counted towards allResourcesSubscribed. One inside the expiry
			// threshold still delivers, and still carries a secret create() replaces.
			it('should delete a subscription that is too close to expiry to reuse', async () => {
				const staticData: Record<string, unknown> = {
					subscriptionIds: ['sub-expiring'],
					webhookSecret: 'stored-secret',
				};
				(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValue([
					{
						id: 'sub-expiring',
						notificationUrl: 'https://webhook.url',
						resource: '/me/chats',
						expirationDateTime: new Date(Date.now() + 60000).toISOString(),
					},
				]);
				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({});

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
					mockWebhookFunctions,
					'DELETE',
					'/v1.0/subscriptions/sub-expiring',
				);
			});

			// Declining is not enough on its own: create() mints a fresh clientState,
			// so anything left on this URL keeps delivering with a secret we can no
			// longer verify.
			it('should delete a live subscription on another resource and clear both keys', async () => {
				const staticData: Record<string, unknown> = {
					subscriptionIds: ['sub-other'],
					webhookSecret: 'stored-secret',
				};
				(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValue([
					{
						id: 'sub-other',
						notificationUrl: 'https://webhook.url',
						resource: '/teams/t1/channels/c1/messages',
						expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
					},
				]);
				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({});

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
					mockWebhookFunctions,
					'DELETE',
					'/v1.0/subscriptions/sub-other',
				);
				expect(staticData.subscriptionIds).toBeUndefined();
				expect(staticData.webhookSecret).toBeUndefined();
			});

			it('should return false if the subscription does not exist', async () => {
				(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValue([]);

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
				(microsoftApiRequestAllItems.call as jest.Mock).mockRejectedValue(
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
				const staticData: Record<string, unknown> = { subscriptionIds: [] };

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getNodeParameter.mockReturnValue('newChat');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({
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

			// A secret Graph holds but the node does not is the state this fix exists
			// to reject, so the sent value and the stored one have to be the same.
			it('should store the secret it sent to Graph', async () => {
				const staticData: Record<string, unknown> = {};

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getNodeParameter.mockReturnValue('newChat');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({ id: 'subscription123' });

				await new MicrosoftTeamsTrigger().webhookMethods.default.create.call(mockWebhookFunctions);

				const [, , , body] = (microsoftApiRequest.call as jest.Mock).mock.calls[0];
				expect(staticData.webhookSecret).toBe(body.clientState);
				expect(staticData.subscriptionIds).toEqual(['subscription123']);
			});

			// One activation watching many resources has to end on one secret, or
			// only the last subscription's notifications ever verify.
			it('should send the same secret for every resource of a fan-out event', async () => {
				const staticData: Record<string, unknown> = {};

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					if (paramName === 'event') return 'newChannel';
					if (paramName === 'watchAllTeams') return true;
					return false;
				});
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
				(microsoftApiRequest.call as jest.Mock).mockImplementation(
					async (_ctx: unknown, method: string) =>
						method === 'GET'
							? { value: [{ id: 'team1' }, { id: 'team2' }] }
							: { id: `sub-${(microsoftApiRequest.call as jest.Mock).mock.calls.length}` },
				);

				await new MicrosoftTeamsTrigger().webhookMethods.default.create.call(mockWebhookFunctions);

				const sentStates = (microsoftApiRequest.call as jest.Mock).mock.calls
					.filter(([, method]) => method === 'POST')
					.map(([, , , body]) => body.clientState);

				expect(sentStates).toHaveLength(2);
				expect(new Set(sentStates).size).toBe(1);
				expect(staticData.webhookSecret).toBe(sentStates[0]);
				// Without the ids, delete() stops at its guard and every subscription
				// this activation made outlives the workflow.
				expect(staticData.subscriptionIds).toHaveLength(2);
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
				const mockWebhookData: Record<string, unknown> = {
					subscriptionIds: ['subscription123'],
					webhookSecret: 'stored-secret',
				};

				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(mockWebhookData);

				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({});

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
				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({});

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
				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({});

				await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(mockWebhookFunctions);

				expect((microsoftApiRequest.call as jest.Mock).mock.calls).toHaveLength(2);
			});

			it('should return false when no ids are stored', async () => {
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(
					mockWebhookFunctions,
				);
				expect(result).toBe(false);
				expect(microsoftApiRequest.call).not.toHaveBeenCalled();
			});

			// Static data is flat; a nested `node` key returns at the guard and never
			// reaches the request, so the rejection below would go unexercised.
			it('should keep the stored ids when Graph rejects the delete', async () => {
				const staticData: Record<string, unknown> = {
					subscriptionIds: ['subscription123'],
					webhookSecret: 'stored-secret',
				};
				(microsoftApiRequest.call as jest.Mock).mockRejectedValue(
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
					mockWebhookFunctions,
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
				status: jest.fn().mockReturnThis(),
				send: jest.fn(),
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);
			expect(mockResponse.status).toHaveBeenCalledWith(200);
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
				status: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				end: jest.fn(),
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: 'stored-secret',
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

		it.each([
			['clientState does not match the stored secret', { webhookSecret: 'expected-secret' }],
			['no secret is stored', {}],
		])('should return 401 when %s', async (_label, staticData) => {
			const mockRequest = {
				body: {
					value: [{ clientState: 'wrong-secret-aa', resourceData: { id: '1' } }],
				},
				query: {},
			};
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				end: jest.fn().mockReturnThis(),
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(result.noWebhookResponse).toBe(true);
			expect(result.workflowData).toBeUndefined();
		});
	});
});
