import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const order = { id: 450789469, note: 'Gift' };
const product = { id: 632910392, title: 'Acme T-Shirt' };

describe('Shopify > Workflows', () => {
	const credentials = {
		shopifyAccessTokenApi: {
			shopSubdomain: 'acme-store',
			accessToken: 'fake-access-token',
			appSecretKey: 'fake-app-secret',
		},
	};

	beforeAll(() => {
		const mock = nock('https://acme-store.myshopify.com/admin/api/2024-07');
		mock.post('//orders.json').reply(200, { order });
		mock.delete('//orders/450789469.json').reply(200, {});
		mock.get('//orders/450789469.json').reply(200, { order });
		mock
			.get('//orders.json')
			.query({ limit: 2 })
			.reply(200, { orders: [order] });
		mock.put('//orders/450789469.json').reply(200, { order });
		mock.post('//products.json').reply(200, { product });
		mock.delete('//products/632910392.json').reply(200, {});
		mock.get('//products/632910392.json').reply(200, { product });
		mock
			.get('//products.json')
			.query({ limit: 2 })
			.reply(200, { products: [product] });
		mock.put('//products/632910392.json').reply(200, { product });
	});

	afterAll(() => expect(nock.isDone()).toBe(true));

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
