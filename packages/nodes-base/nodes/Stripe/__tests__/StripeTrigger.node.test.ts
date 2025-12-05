import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';
import { createHmac } from 'crypto';

import { stripeApiRequest } from '../helpers';
import { StripeTrigger } from '../StripeTrigger.node';

jest.mock('../helpers', () => ({
	stripeApiRequest: jest.fn(),
}));

const mockedStripeApiRequest = jest.mocked(stripeApiRequest);

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

	describe('webhook signature verification', () => {
		let mockWebhookFunctions: IWebhookFunctions;
		const webhookSecret = 'whsec_test123456789';
		const timestamp = '1234567890';
		const testBody = { type: 'charge.succeeded', id: 'ch_123' };
		const rawBody = JSON.stringify(testBody);

		beforeEach(() => {
			mockWebhookFunctions = {
				getBodyData: jest.fn().mockReturnValue(testBody),
				getRequestObject: jest.fn().mockReturnValue({
					rawBody: Buffer.from(rawBody),
					body: testBody,
				}),
				getHeaderData: jest.fn(),
				getWorkflowStaticData: jest.fn().mockReturnValue({
					webhookSecret,
				}),
				getNodeParameter: jest.fn().mockReturnValue(['*']),
				helpers: {
					returnJsonArray: jest.fn().mockImplementation((data) => [data]),
				},
			} as unknown as IWebhookFunctions;
		});

		function generateValidSignature(timestamp: string, body: string, secret: string): string {
			const signedPayload = `${timestamp}.${body}`;
			const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');
			return `t=${timestamp},v1=${signature}`;
		}

		it('should process webhook with valid signature', async () => {
			const validSignature = generateValidSignature(timestamp, rawBody, webhookSecret);
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'stripe-signature': validSignature,
			});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [[testBody]],
			});
		});

		it('should reject webhook with missing signature', async () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});

		it('should reject webhook with missing webhook secret', async () => {
			const validSignature = generateValidSignature(timestamp, rawBody, webhookSecret);
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'stripe-signature': validSignature,
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});

		it('should reject webhook with invalid signature format', async () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'stripe-signature': 'invalid-format',
			});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});

		it('should reject webhook with missing timestamp in signature', async () => {
			const signature = createHmac('sha256', webhookSecret)
				.update(`${timestamp}.${rawBody}`)
				.digest('hex');
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'stripe-signature': `v1=${signature}`,
			});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});

		it('should reject webhook with missing v1 signature', async () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'stripe-signature': `t=${timestamp}`,
			});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});

		it('should reject webhook with incorrect signature', async () => {
			const wrongSecret = 'wrong_secret';
			const invalidSignature = generateValidSignature(timestamp, rawBody, wrongSecret);
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'stripe-signature': invalidSignature,
			});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});

		it('should reject webhook with signature for different body', async () => {
			const differentBody = JSON.stringify({ type: 'payment_intent.succeeded' });
			const invalidSignature = generateValidSignature(timestamp, differentBody, webhookSecret);
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'stripe-signature': invalidSignature,
			});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});

		it('should handle events filtering correctly', async () => {
			const validSignature = generateValidSignature(timestamp, rawBody, webhookSecret);
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'stripe-signature': validSignature,
			});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue([
				'payment_intent.succeeded',
			]);

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});

		it('should process webhook when event type matches filter', async () => {
			const validSignature = generateValidSignature(timestamp, rawBody, webhookSecret);
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'stripe-signature': validSignature,
			});
			(mockWebhookFunctions.getNodeParameter as jest.Mock).mockReturnValue(['charge.succeeded']);

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [[testBody]],
			});
		});

		it('should handle complex signature header with multiple elements', async () => {
			const signature = createHmac('sha256', webhookSecret)
				.update(`${timestamp}.${rawBody}`)
				.digest('hex');
			const complexHeader = `t=${timestamp},v1=${signature},v0=old_signature`;
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'stripe-signature': complexHeader,
			});

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [[testBody]],
			});
		});
	});
});
