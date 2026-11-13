import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const batch = { batch_header: { payout_batch_id: '5UXD2E8A7EBQJ' } };
const item = { payout_item_id: '8AELMXH8UB2P8', transaction_status: 'UNCLAIMED' };

describe('PayPal > Workflows', () => {
	const credentials = {
		payPalApi: {
			clientId: 'fake-client-id',
			secret: 'fake-secret',
			env: 'live',
		},
	};

	beforeAll(() => {
		const api = nock('https://api-m.paypal.com/v1');
		api.post('/oauth2/token', 'grant_type=client_credentials').times(6).reply(200, {
			access_token: 'fake-access-token',
		});

		const authed = nock('https://api-m.paypal.com/v1').matchHeader(
			'authorization',
			'Bearer fake-access-token',
		);
		authed
			.post('/payments/payouts', {
				sender_batch_header: { sender_batch_id: 'Payouts_2024_100007' },
				items: [{ recipient_type: 'EMAIL', receiver: 'nathan@example.com' }],
			})
			.reply(201, batch);
		authed
			.get('/payments/payouts/5UXD2E8A7EBQJ')
			.query({ page_size: 1000 })
			.reply(200, {
				items: [{ payout_item_id: 'ITEM1' }],
				links: [
					{
						rel: 'next',
						href: 'https://api-m.paypal.com/v1/payments/payouts/5UXD2E8A7EBQJ?page=2&page_size=1000',
					},
				],
			});
		authed
			.get('/payments/payouts/5UXD2E8A7EBQJ')
			.query(true)
			.reply(200, { items: [{ payout_item_id: 'ITEM2' }], links: [] });
		authed
			.get('/payments/payouts/5UXD2E8A7EBQJ')
			.query({ page_size: 2 })
			.reply(200, { items: [{ payout_item_id: 'ITEM1' }, { payout_item_id: 'ITEM2' }] });
		authed.get('/payments/payouts-item/8AELMXH8UB2P8').reply(200, item);
		authed.post('/payments/payouts-item/8AELMXH8UB2P8/cancel').reply(200, item);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
