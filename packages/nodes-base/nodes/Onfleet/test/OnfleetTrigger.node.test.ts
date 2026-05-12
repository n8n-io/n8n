import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { OnfleetTrigger } from '../OnfleetTrigger.node';

describe('Onfleet Trigger Node', () => {
	let node: OnfleetTrigger;
	let mockWebhookFunctions: IWebhookFunctions;

	const testSecretHex = 'a'.repeat(64);
	const testBody = '{"taskId":"task123","actionContext":"COMPLETE"}';

	const computeSignature = (secretHex: string, body: string): string => {
		const hmac = createHmac('sha512', Buffer.from(secretHex, 'hex'));
		hmac.update(Buffer.from(body));
		return hmac.digest('hex');
	};

	beforeEach(() => {
		node = new OnfleetTrigger();
		mockWebhookFunctions = {
			getWebhookName: jest.fn(),
			getRequestObject: jest.fn(),
			getResponseObject: jest.fn(),
			getBodyData: jest.fn(),
			getCredentials: jest.fn(),
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
			const mockRequestData = {
				taskId: 'task123',
				workerId: 'worker456',
				actionContext: 'COMPLETE',
			};

			it('should process the request when no signing secret is configured (backward compatibility)', async () => {
				const mockRequest = {
					query: {},
					header: jest.fn().mockReturnValue(undefined),
					rawBody: Buffer.from(testBody),
				};

				(mockWebhookFunctions.getWebhookName as jest.Mock).mockReturnValue('default');
				(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue(mockRequest);
				(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue({
					apiKey: 'test-api-key',
				});
				(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue(mockRequestData);

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(result).toEqual({
					workflowData: [[{ json: mockRequestData }]],
				});
			});

			it('should process the request when the signature is valid', async () => {
				const validSignature = computeSignature(testSecretHex, testBody);
				const mockRequest = {
					query: {},
					header: jest.fn().mockImplementation((header: string) => {
						if (header === 'x-onfleet-signature') return validSignature;
						return undefined;
					}),
					rawBody: Buffer.from(testBody),
				};

				(mockWebhookFunctions.getWebhookName as jest.Mock).mockReturnValue('default');
				(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue(mockRequest);
				(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue({
					apiKey: 'test-api-key',
					signingSecret: testSecretHex,
				});
				(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue(mockRequestData);

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(result).toEqual({
					workflowData: [[{ json: mockRequestData }]],
				});
			});

			it('should respond with 401 and not trigger the workflow when the signature is invalid', async () => {
				const mockRequest = {
					query: {},
					header: jest.fn().mockImplementation((header: string) => {
						if (header === 'x-onfleet-signature') return 'f'.repeat(128);
						return undefined;
					}),
					rawBody: Buffer.from(testBody),
				};

				const mockResponse = {
					status: jest.fn().mockReturnThis(),
					send: jest.fn().mockReturnThis(),
					end: jest.fn().mockReturnThis(),
				};

				(mockWebhookFunctions.getWebhookName as jest.Mock).mockReturnValue('default');
				(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue(mockRequest);
				(mockWebhookFunctions.getResponseObject as jest.Mock).mockReturnValue(mockResponse);
				(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue({
					apiKey: 'test-api-key',
					signingSecret: testSecretHex,
				});

				const result = await node.webhook.call(mockWebhookFunctions);

				expect(mockResponse.status).toHaveBeenCalledWith(401);
				expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
				expect(mockResponse.end).toHaveBeenCalled();
				expect(result).toEqual({ noWebhookResponse: true });
				expect(mockWebhookFunctions.getBodyData).not.toHaveBeenCalled();
			});
		});
	});
});
