import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const customerId = 'cus_NffrFeUfNV2Hib';
const chargeId = 'ch_3MmlLrLkdIwHu7ix0snN0B15';
const cardId = 'card_1MvoiELkdIwHu7ix1mD3EUce';
const sourceId = 'src_1N3lxdLkdIwHu7ixPHXy4X5V';

describe('Stripe > Workflows > Request URLs', () => {
	const credentials = { stripeApi: { secretKey: 'sk_test_fake_key' } };

	beforeAll(() => {
		const mock = nock('https://api.stripe.com/v1');
		mock.get('/balance').reply(200, { object: 'balance', livemode: false });
		mock
			.post(`/customers/${customerId}/sources`, { source: 'tok_visa' })
			.reply(200, { id: cardId, object: 'card' });
		mock
			.get(`/customers/${customerId}/sources/${sourceId}`)
			.reply(200, { id: sourceId, object: 'source' });
		mock
			.delete(`/customers/${customerId}/sources/${cardId}`)
			.reply(200, { id: cardId, deleted: true });
		mock.get(`/charges/${chargeId}`).reply(200, { id: chargeId, object: 'charge' });
		mock
			.get('/charges')
			.reply(200, { data: [{ id: chargeId, object: 'charge' }], has_more: false });
		mock
			.post(`/charges/${chargeId}`, { description: 'Updated' })
			.reply(200, { id: chargeId, description: 'Updated' });
		mock
			.get('/coupons')
			.reply(200, { data: [{ id: 'Z4OV52SU', object: 'coupon' }], has_more: false });
		mock.get(`/customers/${customerId}`).reply(200, { id: customerId, name: 'Nathan' });
		mock
			.get('/customers')
			.query({ email: 'nathan@example.com' })
			.reply(200, { data: [{ id: customerId, name: 'Nathan' }], has_more: false });
		mock
			.post(`/customers/${customerId}`, { description: 'VIP' })
			.reply(200, { id: customerId, description: 'VIP' });
		mock.delete(`/customers/${customerId}`).reply(200, { id: customerId, deleted: true });
		mock.post('/sources').reply(200, { id: sourceId, object: 'source' });
		mock
			.post(`/customers/${customerId}/sources`, { source: sourceId })
			.reply(200, { id: sourceId, object: 'source' });
		mock.get(`/sources/${sourceId}`).reply(200, { id: sourceId, object: 'source' });
		mock
			.delete(`/customers/${customerId}/sources/${sourceId}`)
			.reply(200, { id: sourceId, status: 'consumed' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
