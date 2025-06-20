import type { IHookFunctions } from 'n8n-workflow';

import { stripeApiRequest } from '../helpers';
import { StripeTrigger } from '../StripeTrigger.node';

jest.mock('../helpers', () => ({
	stripeApiRequest: jest.fn(),
}));

const mockedStripeApiRequest = jest.mocked(stripeApiRequest);

describe('Stripe Trigger Node', () => {
	let node: StripeTrigger;
	let mockHookFunctions: IHookFunctions;

	beforeEach(() => {
		node = new StripeTrigger();

		mockHookFunctions = {
			getNodeWebhookUrl: jest.fn().mockReturnValue('https://webhook.url/test'),
			getWorkflow: jest.fn().mockReturnValue({ id: 'test-workflow-id' }),
			getNodeParameter: jest.fn().mockReturnValue(['*']),
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

		mockedStripeApiRequest.mockClear();
	});

	afterAll(() => {
		jest.clearAllMocks();
	});

	it('should not send api version in body if not specified in credentials', async () => {
		(mockHookFunctions.getCredentials as jest.Mock).mockResolvedValue({
			secretKey: 'sk_test_123',
		});

		mockedStripeApiRequest.mockResolvedValue({
			id: 'we_test123',
			secret: 'whsec_test123',
			status: 'enabled',
			enabled_events: ['*'],
		});

		const expectedRequestBody = {
			url: 'https://webhook.url/test',
			description: 'Created by n8n for workflow ID: test-workflow-id',
			enabled_events: ['*'],
		};

		const endpoint = '/webhook_endpoints';

		await node.webhookMethods.default.create.call(mockHookFunctions);
		expect(mockedStripeApiRequest).toHaveBeenCalledWith('POST', endpoint, expectedRequestBody);

		const callArgs = mockedStripeApiRequest.mock.calls[0];
		const requestBody = callArgs[2];
		expect(requestBody).not.toHaveProperty('api_version');
	});

	it('should send api version in body if specified in credentials', async () => {
		(mockHookFunctions.getCredentials as jest.Mock).mockResolvedValue({
			secretKey: 'sk_test_123',
			apiVersion: '2025-05-28.basil',
		});

		mockedStripeApiRequest.mockResolvedValue({
			id: 'we_test123',
			secret: 'whsec_test123',
			status: 'enabled',
			enabled_events: ['*'],
		});

		const expectedRequestBody = {
			url: 'https://webhook.url/test',
			description: 'Created by n8n for workflow ID: test-workflow-id',
			enabled_events: ['*'],
			api_version: '2025-05-28.basil',
		};

		const endpoint = '/webhook_endpoints';

		await node.webhookMethods.default.create.call(mockHookFunctions);
		expect(mockedStripeApiRequest).toHaveBeenCalledWith('POST', endpoint, expectedRequestBody);

		const callArgs = mockedStripeApiRequest.mock.calls[0];
		const requestBody = callArgs[2];
		expect(requestBody).toHaveProperty('api_version', '2025-05-28.basil');
	});
});
