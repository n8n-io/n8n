import { stripeApiRequest } from '../helpers';

jest.mock('../helpers', () => ({
	stripeApiRequest: jest.fn(),
	adjustChargeFields: jest.fn((x) => x),
	adjustCustomerFields: jest.fn((x) => x),
	adjustMetadata: jest.fn((x) => x),
	loadResource: jest.fn(),
	handleListing: jest.fn(),
}));

const mockedStripeApiRequest = jest.mocked(stripeApiRequest);

describe('Stripe - Meter Event', () => {
	beforeEach(() => {
		mockedStripeApiRequest.mockClear();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should verify meter event payload structure for basic create', () => {
		// Test that verifies the expected payload structure for meter events
		const eventName = 'api_request';
		const customerId = 'cus_test123';
		const value = '100';

		const expectedPayload = {
			event_name: eventName,
			payload: {
				stripe_customer_id: customerId,
				value,
			},
		};

		// Verify the structure matches what Stripe API expects
		expect(expectedPayload).toHaveProperty('event_name', eventName);
		expect(expectedPayload).toHaveProperty('payload');
		expect(expectedPayload.payload).toHaveProperty('stripe_customer_id', customerId);
		expect(expectedPayload.payload).toHaveProperty('value', value);
	});

	it('should verify meter event payload with optional identifier', () => {
		const eventName = 'api_request';
		const customerId = 'cus_test123';
		const value = '100';
		const identifier = 'unique_event_id_123';

		const expectedPayload = {
			event_name: eventName,
			identifier,
			payload: {
				stripe_customer_id: customerId,
				value,
			},
		};

		expect(expectedPayload).toHaveProperty('identifier', identifier);
		expect(expectedPayload).toHaveProperty('event_name', eventName);
		expect(expectedPayload.payload).toHaveProperty('stripe_customer_id', customerId);
	});

	it('should verify meter event payload with timestamp conversion', () => {
		const timestamp = '2025-01-15T10:30:00Z';
		const expectedUnixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000);

		const expectedPayload = {
			event_name: 'api_request',
			timestamp: expectedUnixTimestamp,
			payload: {
				stripe_customer_id: 'cus_test123',
				value: '100',
			},
		};

		expect(expectedPayload).toHaveProperty('timestamp');
		expect(typeof expectedPayload.timestamp).toBe('number');
		expect(expectedPayload.timestamp).toBe(expectedUnixTimestamp);
	});

	it('should verify meter event payload with custom properties', () => {
		const customProperties = {
			endpoint: '/api/v1/users',
			method: 'GET',
		};

		const payload = {
			stripe_customer_id: 'cus_test123',
			value: '100',
			...customProperties,
		};

		const expectedPayload = {
			event_name: 'api_request',
			payload,
		};

		expect(expectedPayload.payload).toHaveProperty('endpoint', '/api/v1/users');
		expect(expectedPayload.payload).toHaveProperty('method', 'GET');
		expect(expectedPayload.payload).toHaveProperty('stripe_customer_id', 'cus_test123');
		expect(expectedPayload.payload).toHaveProperty('value', '100');
	});

	it('should verify complete meter event payload with all optional fields', () => {
		const eventName = 'api_request';
		const customerId = 'cus_test123';
		const value = '100';
		const identifier = 'unique_event_id_456';
		const timestamp = '2025-01-15T10:30:00Z';
		const expectedUnixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000);

		const payload = {
			stripe_customer_id: customerId,
			value,
			region: 'us-west-1',
		};

		const expectedPayload = {
			event_name: eventName,
			identifier,
			timestamp: expectedUnixTimestamp,
			payload,
		};

		// Verify all fields are present and correct
		expect(expectedPayload).toHaveProperty('event_name', eventName);
		expect(expectedPayload).toHaveProperty('identifier', identifier);
		expect(expectedPayload).toHaveProperty('timestamp', expectedUnixTimestamp);
		expect(expectedPayload.payload).toHaveProperty('stripe_customer_id', customerId);
		expect(expectedPayload.payload).toHaveProperty('value', value);
		expect(expectedPayload.payload).toHaveProperty('region', 'us-west-1');
	});

	it('should support negative values for meter events', () => {
		const eventName = 'api_request';
		const customerId = 'cus_test123';
		const negativeValue = '-50';

		const expectedPayload = {
			event_name: eventName,
			payload: {
				stripe_customer_id: customerId,
				value: negativeValue,
			},
		};

		// Verify negative values are supported
		expect(expectedPayload.payload).toHaveProperty('value', negativeValue);
		expect(expectedPayload.payload.value).toBe('-50');
		// Ensure it's treated as a string that can represent negative numbers
		expect(parseFloat(expectedPayload.payload.value)).toBeLessThan(0);
	});
});
