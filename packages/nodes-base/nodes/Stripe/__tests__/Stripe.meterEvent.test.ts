import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { Stripe } from '../Stripe.node';
import * as helpers from '../helpers';

// Mock the helpers module
jest.mock('../helpers');
const mockHelpers = jest.mocked(helpers);

describe('Stripe Node - MeterEvent', () => {
	let node: Stripe;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		node = new Stripe();
		mockExecuteFunctions = mock<IExecuteFunctions>();
		jest.clearAllMocks();

		// Setup basic mocks
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.helpers = {
			constructExecutionMetaData: jest
				.fn()
				.mockImplementation((data, meta) => [{ json: data[0], ...meta }]),
			returnJsonArray: jest
				.fn()
				.mockImplementation((data) => (Array.isArray(data) ? data : [data])),
		} as any;
	});

	it('should create a meter event successfully', async () => {
		// Setup parameters
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'resource':
					return 'meterEvent';
				case 'operation':
					return 'create';
				case 'eventName':
					return 'api_usage';
				case 'customerId':
					return 'cus_12345678';
				case 'value':
					return 25;
				case 'additionalFields':
					return {};
				default:
					return undefined;
			}
		});

		// Mock API response
		const mockResponse = {
			object: 'billing.meter_event',
			created: 1704824589,
			event_name: 'api_usage',
			identifier: 'generated_id_123',
			livemode: false,
			payload: {
				stripe_customer_id: 'cus_12345678',
				value: '25',
			},
			timestamp: 1704824589,
		};

		mockHelpers.stripeApiRequest.mockResolvedValue(mockResponse);

		// Execute
		const result = await node.execute.call(mockExecuteFunctions);

		// Verify API call
		expect(mockHelpers.stripeApiRequest).toHaveBeenCalledWith(
			'POST',
			'/billing/meter_events',
			{
				event_name: 'api_usage',
				'payload[stripe_customer_id]': 'cus_12345678',
				'payload[value]': '25',
			},
			{},
		);

		// Verify result structure
		expect(result).toBeDefined();
		expect(result[0]).toHaveLength(1);
		expect(result[0][0].json).toEqual(mockResponse);
	});

	it('should handle additional fields correctly', async () => {
		// Setup parameters with additional fields
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'resource':
					return 'meterEvent';
				case 'operation':
					return 'create';
				case 'eventName':
					return 'api_usage';
				case 'customerId':
					return 'cus_12345678';
				case 'value':
					return 50;
				case 'additionalFields':
					return {
						identifier: 'custom_id_123',
						timestamp: '2024-01-01T12:00:00Z',
					};
				default:
					return undefined;
			}
		});

		const mockResponse = {
			object: 'billing.meter_event',
			event_name: 'api_usage',
			identifier: 'custom_id_123',
		};

		mockHelpers.stripeApiRequest.mockResolvedValue(mockResponse);

		await node.execute.call(mockExecuteFunctions);

		// Verify API call includes additional fields
		expect(mockHelpers.stripeApiRequest).toHaveBeenCalledWith(
			'POST',
			'/billing/meter_events',
			{
				event_name: 'api_usage',
				'payload[stripe_customer_id]': 'cus_12345678',
				'payload[value]': '50',
				identifier: 'custom_id_123',
				timestamp: 1704110400,
			},
			{},
		);
	});

	it('should handle custom payload fields correctly', async () => {
		// Setup parameters with custom payload fields
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'resource':
					return 'meterEvent';
				case 'operation':
					return 'create';
				case 'eventName':
					return 'api_usage';
				case 'customerId':
					return 'cus_12345678';
				case 'value':
					return 100;
				case 'additionalFields':
					return {
						customPayloadFields: {
							values: [
								{ key: 'region', value: 'us-east-1' },
								{ key: 'tier', value: 'premium' },
							],
						},
					};
				default:
					return undefined;
			}
		});

		const mockResponse = {
			object: 'billing.meter_event',
			event_name: 'api_usage',
		};

		mockHelpers.stripeApiRequest.mockResolvedValue(mockResponse);

		await node.execute.call(mockExecuteFunctions);

		// Verify API call includes custom payload fields
		expect(mockHelpers.stripeApiRequest).toHaveBeenCalledWith(
			'POST',
			'/billing/meter_events',
			{
				event_name: 'api_usage',
				'payload[stripe_customer_id]': 'cus_12345678',
				'payload[value]': '100',
				'payload[region]': 'us-east-1',
				'payload[tier]': 'premium',
			},
			{},
		);
	});

	it('should handle negative values correctly', async () => {
		// Setup parameters with negative value
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'resource':
					return 'meterEvent';
				case 'operation':
					return 'create';
				case 'eventName':
					return 'api_usage';
				case 'customerId':
					return 'cus_12345678';
				case 'value':
					return -25;
				case 'additionalFields':
					return {};
				default:
					return undefined;
			}
		});

		const mockResponse = {
			object: 'billing.meter_event',
			event_name: 'api_usage',
			payload: {
				stripe_customer_id: 'cus_12345678',
				value: '-25',
			},
		};

		mockHelpers.stripeApiRequest.mockResolvedValue(mockResponse);

		await node.execute.call(mockExecuteFunctions);

		// Verify API call accepts negative value
		expect(mockHelpers.stripeApiRequest).toHaveBeenCalledWith(
			'POST',
			'/billing/meter_events',
			{
				event_name: 'api_usage',
				'payload[stripe_customer_id]': 'cus_12345678',
				'payload[value]': '-25',
			},
			{},
		);
	});

	it('should handle timestamp edge cases', async () => {
		// Test with a timestamp at the maximum allowed (5 minutes in future)
		const futureTimestamp = new Date(Date.now() + 4 * 60 * 1000).toISOString();

		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'resource':
					return 'meterEvent';
				case 'operation':
					return 'create';
				case 'eventName':
					return 'api_usage';
				case 'customerId':
					return 'cus_12345678';
				case 'value':
					return 10;
				case 'additionalFields':
					return {
						timestamp: futureTimestamp,
					};
				default:
					return undefined;
			}
		});

		const mockResponse = {
			object: 'billing.meter_event',
			event_name: 'api_usage',
		};

		mockHelpers.stripeApiRequest.mockResolvedValue(mockResponse);

		await node.execute.call(mockExecuteFunctions);

		const expectedTimestamp = Math.floor(new Date(futureTimestamp).getTime() / 1000);

		// Verify timestamp is converted to Unix timestamp (integer)
		expect(mockHelpers.stripeApiRequest).toHaveBeenCalledWith(
			'POST',
			'/billing/meter_events',
			expect.objectContaining({
				timestamp: expectedTimestamp,
			}),
			{},
		);
	});
});
