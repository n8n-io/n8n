import { mock } from 'jest-mock-extended';

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
		mockWebhookFunctions.logger = {
			warn: jest.fn(),
		};
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
				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({ id: 'subscription123' });

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getNodeParameter.mockReturnValue('newChat');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
					node: {
						subscriptionIds: [],
					},
				});

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

			it('should persist a clientState secret on the workflow static data', async () => {
				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({ id: 'subscription123' });

				const staticData: { subscriptionIds?: string[]; webhookSecret?: string } = {};
				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getNodeParameter.mockReturnValue('newChat');
				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

				await new MicrosoftTeamsTrigger().webhookMethods.default.create.call(mockWebhookFunctions);

				expect(typeof staticData.webhookSecret).toBe('string');
				expect((staticData.webhookSecret as string).length).toBeGreaterThan(0);

				const requestBody = (microsoftApiRequest.call as jest.Mock).mock.calls[0][3] as Record<
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

			it('should return false if no subscription matches', async () => {
				(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValue([]);
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
				(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValue([
					{ id: 'subscription123', notificationUrl: 'https://webhook.url' },
				]);
				(microsoftApiRequest.call as jest.Mock).mockRejectedValue(new Error('API request failed'));
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
					value: [{ resourceData: { message: 'test message' } }],
				},
				query: {},
			};
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn(),
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
				status: jest.fn().mockReturnThis(),
				send: jest.fn(),
				end: jest.fn(),
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
				status: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				end: jest.fn().mockReturnThis(),
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
				status: jest.fn().mockReturnThis(),
				send: jest.fn(),
				end: jest.fn(),
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(mockResponse.status).not.toHaveBeenCalledWith(401);
			expect(result.workflowData).toEqual([[{ json: { id: '1' } }]]);
		});

		it('should create a channel message subscription and not emit channel notifications', async () => {
			const staticData: {
				subscriptionIds: string[];
				webhookSecret: string;
			} = {
				subscriptionIds: ['channel-list-subscription'],
				webhookSecret: 'expected-secret',
			};
			const mockRequest = {
				body: {
					value: [
						{
							changeType: 'created',
							clientState: 'expected-secret',
							resource: "teams('team123')/channels('channel123')",
							resourceData: {
								id: 'channel123',
								'@odata.type': '#Microsoft.Graph.channel',
								'@odata.id': "teams('team123')/channels('channel123')",
							},
						},
					],
				},
				query: {},
			};
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn(),
				end: jest.fn(),
			};

			(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValueOnce([]);
			(microsoftApiRequest.call as jest.Mock).mockResolvedValueOnce({
				id: 'channel-message-subscription',
			});

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
			mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'event') return 'newChannelMessage';
				return undefined;
			});

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(result.noWebhookResponse).toBe(true);
			expect(result.workflowData).toBeUndefined();
			expect(microsoftApiRequest.call).toHaveBeenCalledWith(
				mockWebhookFunctions,
				'POST',
				'/v1.0/subscriptions',
				expect.objectContaining({
					notificationUrl: 'https://webhook.url',
					resource: '/teams/team123/channels/channel123/messages',
					clientState: 'expected-secret',
				}),
			);
			expect(staticData.subscriptionIds).toEqual([
				'channel-list-subscription',
				'channel-message-subscription',
			]);
		});

		it('should ignore deleted channel notifications', async () => {
			const mockRequest = {
				body: {
					value: [
						{
							changeType: 'deleted',
							clientState: 'expected-secret',
							resource: "teams('team123')/channels('channel123')",
							resourceData: {
								id: 'channel123',
								'@odata.type': '#Microsoft.Graph.channel',
								'@odata.id': "teams('team123')/channels('channel123')",
							},
						},
					],
				},
				query: {},
			};
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn(),
				end: jest.fn(),
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: 'expected-secret',
			});
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'event') return 'newChannelMessage';
				return undefined;
			});

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(result.noWebhookResponse).toBe(true);
			expect(result.workflowData).toBeUndefined();
			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
		});

		it('should not create duplicate channel message subscriptions', async () => {
			const mockRequest = {
				body: {
					value: [
						{
							changeType: 'created',
							clientState: 'expected-secret',
							resource: "teams('team123')/channels('channel123')",
							resourceData: {
								id: 'channel123',
								'@odata.type': '#Microsoft.Graph.channel',
								'@odata.id': "teams('team123')/channels('channel123')",
							},
						},
					],
				},
				query: {},
			};
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn(),
				end: jest.fn(),
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: 'expected-secret',
			});
			(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValueOnce([
				{
					id: 'channel-message-subscription',
					notificationUrl: 'https://webhook.url',
					resource: '/teams/team123/channels/channel123/messages',
				},
			]);
			mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'event') return 'newChannelMessage';
				return undefined;
			});

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(result.noWebhookResponse).toBe(true);
			expect(result.workflowData).toBeUndefined();
			expect(microsoftApiRequest.call).not.toHaveBeenCalledWith(
				mockWebhookFunctions,
				'POST',
				'/v1.0/subscriptions',
				expect.anything(),
			);
		});

		it('should emit message notifications from a mixed batch', async () => {
			const staticData: {
				subscriptionIds: string[];
				webhookSecret: string;
			} = {
				subscriptionIds: ['channel-list-subscription'],
				webhookSecret: 'expected-secret',
			};
			const mockRequest = {
				body: {
					value: [
						{
							changeType: 'created',
							clientState: 'expected-secret',
							resource: "teams('team123')/channels('channel123')",
							resourceData: {
								id: 'channel123',
								'@odata.type': '#Microsoft.Graph.channel',
								'@odata.id': "teams('team123')/channels('channel123')",
							},
						},
						{
							changeType: 'created',
							clientState: 'expected-secret',
							resource: "teams('team123')/channels('channel123')/messages('message123')",
							resourceData: {
								id: 'message123',
								'@odata.type': '#Microsoft.Graph.chatMessage',
								'@odata.id': "teams('team123')/channels('channel123')/messages('message123')",
							},
						},
					],
				},
				query: {},
			};
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn(),
				end: jest.fn(),
			};

			(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValueOnce([]);
			(microsoftApiRequest.call as jest.Mock).mockResolvedValueOnce({
				id: 'channel-message-subscription',
			});

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
			mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'event') return 'newChannelMessage';
				return undefined;
			});

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(result.workflowData).toEqual([
				[
					{
						json: {
							id: 'message123',
							'@odata.type': '#Microsoft.Graph.chatMessage',
							'@odata.id': "teams('team123')/channels('channel123')/messages('message123')",
						},
					},
				],
			]);
			expect(staticData.subscriptionIds).toEqual([
				'channel-list-subscription',
				'channel-message-subscription',
			]);
		});

		it('should log and ack if creating a channel message subscription fails', async () => {
			const staticData: {
				subscriptionIds: string[];
				webhookSecret: string;
			} = {
				subscriptionIds: ['channel-list-subscription'],
				webhookSecret: 'expected-secret',
			};
			const mockRequest = {
				body: {
					value: [
						{
							changeType: 'created',
							clientState: 'expected-secret',
							resource: "teams('team123')/channels('channel123')",
							resourceData: {
								id: 'channel123',
								'@odata.type': '#Microsoft.Graph.channel',
								'@odata.id': "teams('team123')/channels('channel123')",
							},
						},
					],
				},
				query: {},
			};
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn(),
				end: jest.fn(),
			};
			const error = new Error('Failed to create subscription');

			(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValueOnce([]);
			(microsoftApiRequest.call as jest.Mock).mockRejectedValueOnce(error);

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
			mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'event') return 'newChannelMessage';
				return undefined;
			});

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(result.noWebhookResponse).toBe(true);
			expect(result.workflowData).toBeUndefined();
			expect(staticData.subscriptionIds).toEqual(['channel-list-subscription']);
			expect(mockWebhookFunctions.logger.warn).toHaveBeenCalledWith(
				'Failed to create Microsoft Teams channel message subscription',
				{ error },
			);
		});
	});
});
