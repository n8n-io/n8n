import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { stripeApiRequest } from '../helpers';
import { StripeTrigger } from '../StripeTrigger.node';
import { verifySignature } from '../StripeTriggerHelpers';
import type { Mock } from 'vitest';

vi.mock('../helpers', () => ({
	stripeApiRequest: vi.fn(),
}));

vi.mock('../StripeTriggerHelpers', () => ({
	verifySignature: vi.fn().mockResolvedValue(true),
}));

const mockedStripeApiRequest = vi.mocked(stripeApiRequest);
const mockedVerifySignature = vi.mocked(verifySignature);

describe('Stripe Trigger Node', () => {
	let node: StripeTrigger;
	let mockNodeFunctions: IHookFunctions;
	let mockResponse: {
		status: Mock;
		send: Mock;
		end: Mock;
	};

	beforeEach(() => {
		node = new StripeTrigger();

		mockNodeFunctions = {
			getNodeWebhookUrl: vi.fn().mockReturnValue('https://webhook.url/test'),
			getWorkflow: vi.fn().mockReturnValue({ id: 'test-workflow-id' }),
			getNodeParameter: vi.fn(),
			getCredentials: vi.fn(),
			getWorkflowStaticData: vi.fn().mockReturnValue({}),
			getNode: vi.fn().mockReturnValue({ name: 'StripeTrigger' }),
			getWebhookName: vi.fn().mockReturnValue('default'),
			getContext: vi.fn(),
			getActivationMode: vi.fn(),
			getMode: vi.fn(),
			getNodeExecutionData: vi.fn(),
			getRestApiUrl: vi.fn(),
			getTimezone: vi.fn(),
			helpers: {} as any,
		} as unknown as IHookFunctions;

		// (mockNodeFunctions.getCredentials as Mock).mockResolvedValue({
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
		vi.clearAllMocks();
	});

	it('should not send API version in body if not specified', async () => {
		(mockNodeFunctions.getNodeParameter as Mock).mockImplementation((param) => {
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
		(mockNodeFunctions.getNodeParameter as Mock).mockImplementation((param) => {
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
		const testBody = { type: 'charge.succeeded', id: 'ch_123' };
		const rawBody = JSON.stringify(testBody);

		beforeEach(() => {
			mockResponse = {
				status: vi.fn().mockReturnThis(),
				send: vi.fn().mockReturnThis(),
				end: vi.fn(),
			};
			mockWebhookFunctions = {
				getBodyData: vi.fn().mockReturnValue(testBody),
				getRequestObject: vi.fn().mockReturnValue({
					rawBody: Buffer.from(rawBody),
					body: testBody,
				}),
				getResponseObject: vi.fn().mockReturnValue(mockResponse),
				getNodeParameter: vi.fn().mockReturnValue(['*']),
				helpers: {
					returnJsonArray: vi.fn().mockImplementation((data) => [data]),
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

		it('should process webhook when verification is skipped because no secret is configured', async () => {
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
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(mockResponse.end).toHaveBeenCalledWith();
			expect(mockedVerifySignature).toHaveBeenCalledWith();
		});

		it('should handle events filtering correctly', async () => {
			mockedVerifySignature.mockResolvedValue(true);
			(mockWebhookFunctions.getNodeParameter as Mock).mockReturnValue(['payment_intent.succeeded']);

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});

		it('should process webhook when event type matches filter', async () => {
			mockedVerifySignature.mockResolvedValue(true);
			(mockWebhookFunctions.getNodeParameter as Mock).mockReturnValue(['charge.succeeded']);

			const result = await node.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				workflowData: [[testBody]],
			});
		});
	});
});
