import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { stripeApiRequest } from '../helpers';
import { StripeTrigger } from '../StripeTrigger.node';
import { verifySignature } from '../StripeTriggerHelpers';

jest.mock('../helpers', () => ({
	stripeApiRequest: jest.fn(),
}));

jest.mock('../StripeTriggerHelpers', () => ({
	verifySignature: jest.fn().mockResolvedValue(true),
}));

const mockedStripeApiRequest = jest.mocked(stripeApiRequest);
const mockedVerifySignature = jest.mocked(verifySignature);

describe('Stripe Trigger Node', () => {
	let node: StripeTrigger;
	let mockNodeFunctions: IHookFunctions;

	beforeEach(() => {
		node = new StripeTrigger();

		mockNodeFunctions = {
			getNodeWebhookUrl: jest.fn().mockReturnValue('https://webhook.url/test'),
			getWorkflow: jest.fn().mockReturnValue({ id: 'test-workflow-id' }),
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn(),
			getWorkflowStaticData: jest.fn().mockReturnValue({}),
			getNode: jest.fn().mockReturnValue({ name: 'StripeTrigger' }),
			getWebhookName: jest.fn().mockReturnValue('default'),
			getContext: jest.fn(),
			getActivationMode: jest.fn(),
			getMode: jest.fn(),
			getNodeExecutionData: jest.fn(),
			getRestApiUrl: jest.fn(),
			getTimezone: jest.fn(),
			helpers: {} as any,
		} as unknown as IHookFunctions;

		// (mockNodeFunctions.getCredentials as jest.Mock).mockResolvedValue({
		// 	secretKey: 'sk_test_123',
		// });

		mockedStripeApiRequest.mockResolvedValue({
			id: 'we_test123',
			secret: 'whsec_test123',
			status: 'enabled',
			enabled_events: ['*'],
		});

		mockedStripeApiRequest.mockClear();
	});

	afterAll(() => {
		jest.clearAllMocks();
	});

	it('should not send API version in body if not specified', async () => {
		(mockNodeFunctions.getNodeParameter as jest.Mock).mockImplementation((param) => {
			if (param === 'events') return ['*'];
			return undefined;
		});

		const expectedRequestBody = {
			url: 'https://webhook.url/test',
			description: 'Created by n8n for workflow ID: test-workflow-id',
			enabled_events: ['*'],
		};

		const endpoint = '/webhook_endpoints';

		await node.webhookMethods.default.create.call(mockNodeFunctions);
		expect(mockedStripeApiRequest).toHaveBeenCalledWith('POST', endpoint, expectedRequestBody);

		const callArgs = mockedStripeApiRequest.mock.calls[0];
		const requestBody = callArgs[2];
		expect(requestBody).not.toHaveProperty('api_version');
	});

	it('should send API version in body if specified in node parameters', async () => {
		(mockNodeFunctions.getNodeParameter as jest.Mock).mockImplementation((param) => {
			if (param === 'apiVersion') return '2025-05-28.basil';
			if (param === 'events') return ['*'];
			return undefined;
		});

		const expectedRequestBody = {
			url: 'https://webhook.url/test',
			description: 'Created by n8n for workflow ID: test-workflow-id',
			enabled_events: ['*'],
			api_version: '2025-05-28.basil',
		};

		const endpoint = '/webhook_endpoints';

		await node.webhookMethods.default.create.call(mockNodeFunctions);
		expect(mockedStripeApiRequest).toHaveBeenCalledWith('POST', endpoint, expectedRequestBody);

		const callArgs = mockedStripeApiRequest.mock.calls[0];
		const requestBody = callArgs[2];
		expect(requestBody).toHaveProperty('api_version', '2025-05-28.basil');
	});

	describe('webhook delete method', () => {
		it('should skip deletion when activation mode is update', async () => {
			(mockNodeFunctions.getActivationMode as jest.Mock).mockReturnValue('update');
			const staticData = { webhookId: 'we_existing123' };
			(mockNodeFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue(staticData);

			const result = await node.webhookMethods.default.delete.call(mockNodeFunctions);

			expect(result).toBe(true);
			expect(mockedStripeApiRequest).not.toHaveBeenCalled();
			expect(staticData.webhookId).toBe('we_existing123');
		});

		it('should delete webhook when activation mode is activate', async () => {
			(mockNodeFunctions.getActivationMode as jest.Mock).mockReturnValue('activate');
			const staticData: Record<string, unknown> = {
				webhookId: 'we_existing123',
				webhookEvents: ['*'],
				webhookSecret: 'whsec_test',
			};
			(mockNodeFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue(staticData);
			mockedStripeApiRequest.mockResolvedValue({});

			const result = await node.webhookMethods.default.delete.call(mockNodeFunctions);

			expect(result).toBe(true);
			expect(mockedStripeApiRequest).toHaveBeenCalledWith(
				'DELETE',
				'/webhook_endpoints/we_existing123',
				{},
			);
			expect(staticData.webhookId).toBeUndefined();
			expect(staticData.webhookEvents).toBeUndefined();
			expect(staticData.webhookSecret).toBeUndefined();
		});

		it('should return true when no webhook exists to delete', async () => {
			(mockNodeFunctions.getActivationMode as jest.Mock).mockReturnValue('activate');
			(mockNodeFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({});

			const result = await node.webhookMethods.default.delete.call(mockNodeFunctions);

			expect(result).toBe(true);
			expect(mockedStripeApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('webhook signature verification', () => {
		let mockWebhookFunctions: IWebhookFunctions;
		const testBody = { type: 'charge.succeeded', id: 'ch_123' };
		const rawBody = JSON.stringify(testBody);

		beforeEach(() => {
			mockWebhookFunctions = {
				getBodyData: jest.fn().mockReturnValue(testBody),
				getRequestObject: jest.fn().mockReturnValue({
					rawBody: Buffer.from(rawBody),
					body: testBody,
				}),
				getResponseObject: jest.fn().mockReturnValue({
					status: jest.fn().mockReturnThis(),
					send: jest.fn().mockReturnThis(),
					end: jest.fn(),
				}),
				getNodeParameter: jest.fn().mockReturnValue(['*']),
				helpers: {
					returnJsonArray: jest.fn().mockImplementation((data) => [data]),
				},
			} as unknown as IWebhookFunctions;

			// Reset the verifySignature mock to return true by default
			mockedVerifySignature.mockResolvedValue(true);
		});

		it('should process webhook with valid signature', async () => {
			mockedVerifySignature.mockResolvedValue(true);

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [[testBody]],
			});
			expect(mockedVerifySignature).toHaveBeenCalledWith();
		});

		it('should reject webhook with invalid signature', async () => {
			mockedVerifySignature.mockResolvedValue(false);

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				noWebhookResponse: true,
			});
			expect(mockedVerifySignature).toHaveBeenCalledWith();
		});

		it('should handle events filtering correctly', async () => {
			mockedVerifySignature.mockResolvedValue(true);
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue([
				'payment_intent.succeeded',
			]);

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});

		it('should process webhook when event type matches filter', async () => {
			mockedVerifySignature.mockResolvedValue(true);
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue(['charge.succeeded']);

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [[testBody]],
			});
		});
	});
});
