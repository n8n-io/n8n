import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const baseUrl = 'https://api.stripe.com/v1';

const meterEventResponse = {
	id: 'evt_test_123',
	object: 'billing.meter_event',
	event_name: 'api_request',
	created: 1705320600,
	payload: {
		stripe_customer_id: 'cus_test123',
		value: 100,
	},
	livemode: false,
};

describe('Stripe - Meter Event Workflows', () => {
	const credentials = {
		stripeApi: {
			secretKey: 'sk_test_fake_key',
		},
	};

	beforeAll(() => {
		// Basic meter event creation
		nock(baseUrl)
			.persist()
			.post('/billing/meter_events', {
				event_name: 'api_request',
				payload: {
					stripe_customer_id: 'cus_test123',
					value: 100,
				},
			})
			.reply(200, meterEventResponse);

		// Meter event with identifier
		nock(baseUrl)
			.persist()
			.post('/billing/meter_events', {
				event_name: 'api_request',
				identifier: 'unique_event_id_123',
				payload: {
					stripe_customer_id: 'cus_test123',
					value: 100,
				},
			})
			.reply(200, {
				...meterEventResponse,
				identifier: 'unique_event_id_123',
			});

		// Meter event with custom payload properties
		nock(baseUrl)
			.persist()
			.post('/billing/meter_events', {
				event_name: 'api_request',
				payload: {
					stripe_customer_id: 'cus_test123',
					value: 100,
					endpoint: '/api/v1/users',
					method: 'GET',
				},
			})
			.reply(200, {
				...meterEventResponse,
				payload: {
					stripe_customer_id: 'cus_test123',
					value: 100,
					endpoint: '/api/v1/users',
					method: 'GET',
				},
			});

		// Negative value support
		nock(baseUrl)
			.persist()
			.post('/billing/meter_events', {
				event_name: 'api_request',
				payload: {
					stripe_customer_id: 'cus_test123',
					value: -50,
				},
			})
			.reply(200, {
				...meterEventResponse,
				payload: {
					stripe_customer_id: 'cus_test123',
					value: -50,
				},
			});
	});

	// NodeTestHarness will discover and run all workflow JSON files in this directory
	new NodeTestHarness().setupTests({ credentials });
});
