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
	let mockHookFunctions: any;

	beforeEach(() => {
		mockWebhookFunctions = mock();
		mockHookFunctions = mock();
		jest.clearAllMocks();
	});

	describe('webhookMethods', () => {
		describe('checkExists', () => {
			it('should return true if the subscription exists', async () => {
				(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValue([
					{ id: 'sub1', notificationUrl: 'https://webhook.url' },
				]);

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');

				mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
					node: {},
				});

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(
					mockWebhookFunctions,
				);
				expect(result).toBe(true);
				expect(microsoftApiRequestAllItems.call).toHaveBeenCalledWith(
					mockWebhookFunctions,
					'value',
					'GET',
					'/v1.0/subscriptions',
				);
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

				await expect(
					new MicrosoftTeamsTrigger().webhookMethods.default.checkExists.call(mockWebhookFunctions),
				).rejects.toThrow('API request failed');
			});
		});

		describe('create', () => {
			it('should create a subscription successfully', async () => {
				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({ id: 'subscription123' });

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
				mockWebhookFunctions.getNodeParameter.mockReturnValue('newChat');

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
					}),
				);
			});

			it('should throw an error if the URL is invalid', async () => {
				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('invalid-url');
				await expect(
					new MicrosoftTeamsTrigger().webhookMethods.default.create.call(mockWebhookFunctions),
				).rejects.toThrow('Invalid Notification URL');
			});
		});

		describe('delete', () => {
			it('should delete a subscription successfully', async () => {
				(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValue([
					{ id: 'subscription123', notificationUrl: 'https://webhook.url' },
				]);

				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({});

				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');

				const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(
					mockWebhookFunctions,
				);
				expect(result).toBe(true);
				expect(microsoftApiRequest.call).toHaveBeenCalledWith(
					mockWebhookFunctions,
					'DELETE',
					'/v1.0/subscriptions/subscription123',
				);
			});

			it('should return false if no subscription matches', async () => {
				(microsoftApiRequestAllItems.call as jest.Mock).mockResolvedValue([]);
				mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue('https://webhook.url');
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

				await expect(
					new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(mockWebhookFunctions),
				).rejects.toThrow('API request failed');
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

			const result = await new MicrosoftTeamsTrigger().webhook.call(mockWebhookFunctions);

			expect(result.workflowData).toEqual([
				[
					{
						json: { message: 'test message' },
					},
				],
			]);
		});
	});
});
