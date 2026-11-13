import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const coupon = { coupon: 'SAVE10', discount_type: 'percentage', discount_amount: 10 };
const payment = { id: 8936, subscription_id: 502198, amount: 10, currency: 'USD', is_paid: 0 };
const plan = { id: 9876, name: 'Monthly', billing_type: 'month' };
const product = { id: 511234, name: 'Pro plan', base_price: 10 };
const user = {
	subscription_id: 502198,
	plan_id: 9876,
	user_id: 425123,
	user_email: 'nathan@example.com',
	state: 'active',
};

describe('Paddle > Workflows', () => {
	const credentials = {
		paddleApi: { vendorId: '12345', vendorAuthCode: 'fake-auth-code', sandbox: false },
	};

	beforeAll(() => {
		const mock = nock('https://vendors.paddle.com/api');
		mock
			.post('/2.1/product/create_coupon')
			.reply(200, { success: true, response: { coupon_codes: ['SAVE10'] } });
		mock.post('/2.0/product/list_coupons').reply(200, { success: true, response: [coupon] });
		mock.post('/2.1/product/update_coupon').reply(200, { success: true, response: { updated: 1 } });
		mock.post('/2.0/subscription/payments').reply(200, { success: true, response: [payment] });
		mock.post('/2.0/subscription/payments_reschedule').reply(200, { success: true });
		mock
			.post('/2.0/subscription/plans')
			.times(2)
			.reply(200, { success: true, response: [plan] });
		mock
			.post('/2.0/product/get_products')
			.reply(200, { success: true, response: { total: 1, count: 1, products: [product] } });
		mock
			.post('/2.0/subscription/users')
			.times(2)
			.reply(200, { success: true, response: [user] });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
