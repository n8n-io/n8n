import type { IWebhookFunctions } from 'n8n-workflow';

import { OnfleetTrigger } from '../OnfleetTrigger.node';

describe('Onfleet Trigger Node', () => {
	let node: OnfleetTrigger;
	let mockWebhookFunctions: IWebhookFunctions;

	beforeEach(() => {
		node = new OnfleetTrigger();
		mockWebhookFunctions = {
			getWebhookName: jest.fn(),
			getRequestObject: jest.fn(),
			getResponseObject: jest.fn(),
			getBodyData: jest.fn(),
			helpers: {
				returnJsonArray: jest.fn().mockImplementation((data) => [{ json: data }]),
			},
		} as unknown as IWebhookFunctions;
	});

	describe('webhook', () => {
		describe('setup webhook validation', () => {
			it('should respond with text/plain content type and check query parameter', async () => {
				const mockRequest = {
					query: {
						check: 'validation-token-123',
					},
				};

				const mockResponse = {
					status: jest.fn().mockReturnThis(),
					type: jest.fn().mockReturnThis(),
					send: jest.fn().mockReturnThis(),
				};

				(mockWebhookFunctions.getWebhookName as jest.Mock).mockReturnValue('setup');
				(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue(mockRequest);
				(mockWebhookFunctions.getResponseObject as jest.Mock).mockReturnValue(mockResponse);

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(mockResponse.status).toHaveBeenCalledWith(200);
				expect(mockResponse.type).toHaveBeenCalledWith('text/plain');
				expect(mockResponse.send).toHaveBeenCalledWith('validation-token-123');
				expect(result).toEqual({ noWebhookResponse: true });
			});
		});

		describe('default webhook', () => {
			it('should process incoming webhook data', async () => {
				const mockRequestData = {
					taskId: 'task123',
					workerId: 'worker456',
					actionContext: 'COMPLETE',
				};

				const mockRequest = {
					query: {},
				};

				(mockWebhookFunctions.getWebhookName as jest.Mock).mockReturnValue('default');
				(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue(mockRequest);
				(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue(mockRequestData);

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(result).toEqual({
					workflowData: [[{ json: mockRequestData }]],
				});
				expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith(mockRequestData);
			});
		});
	});
});
