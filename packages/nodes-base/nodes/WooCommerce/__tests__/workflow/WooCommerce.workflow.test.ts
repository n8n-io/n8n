import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const customerId = 25;
const productId = 794;
const orderId = 727;

describe('WooCommerce > Workflows', () => {
	const credentials = {
		wooCommerceApi: {
			consumerKey: 'ck_fake',
			consumerSecret: 'cs_fake',
			url: 'https://shop.example.com',
			includeCredentialsInQuery: false,
		},
	};

	beforeAll(() => {
		const api = nock('https://shop.example.com/wp-json/wc/v3').matchHeader(
			'authorization',
			`Basic ${Buffer.from('ck_fake:cs_fake').toString('base64')}`,
		);
		const nextPage =
			'<https://shop.example.com/wp-json/wc/v3/customers?per_page=100&page=2>; rel="next"';
		const prevPage =
			'<https://shop.example.com/wp-json/wc/v3/customers?per_page=100&page=1>; rel="prev"';

		api.post('/customers', { email: 'nathan@example.com' }).reply(200, { id: customerId });
		api.delete(`/customers/${customerId}`).query({ force: true }).reply(200, { id: customerId });
		api.get(`/customers/${customerId}`).reply(200, { id: customerId, email: 'nathan@example.com' });
		api
			.get('/customers')
			.query({ per_page: 5 })
			.reply(200, [{ id: customerId }]);
		api
			.get('/customers')
			.query({ per_page: 100 })
			.reply(200, [{ id: customerId }], { link: nextPage });
		api
			.get('/customers')
			.query({ per_page: ['100', '100'], page: 2 })
			.reply(200, [{ id: 26 }], { link: prevPage });
		api.put(`/customers/${customerId}`, { first_name: 'Nathan' }).reply(200, { id: customerId });

		api.post('/products', { name: 'Premium Quality' }).reply(200, { id: productId });
		api.put(`/products/${productId}`, { regular_price: '24.54' }).reply(200, { id: productId });
		api.get(`/products/${productId}`).reply(200, { id: productId, name: 'Premium Quality' });
		api
			.get('/products')
			.query({ per_page: 5 })
			.reply(200, [{ id: productId }]);
		api.delete(`/products/${productId}`).query({ force: true }).reply(200, { id: productId });

		api.post('/orders').reply(200, { id: orderId });
		api.put(`/orders/${orderId}`, { status: 'completed' }).reply(200, { id: orderId });
		api.get(`/orders/${orderId}`).reply(200, { id: orderId, status: 'processing' });
		api
			.get('/orders')
			.query({ per_page: 5 })
			.reply(200, [{ id: orderId }]);
		api.delete(`/orders/${orderId}`).query({ force: true }).reply(200, { id: orderId });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
