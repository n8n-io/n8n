import type { IHookFunctions } from 'n8n-workflow';

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
});
