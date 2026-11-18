import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const customer = { id: 42, email: 'nathan@example.com', firstname: 'Nathan', lastname: 'Smith' };
const order = { entity_id: 1001, increment_id: '000001001', status: 'pending' };
const product = { id: 7, sku: '24-MB01', name: 'Joust Duffle Bag' };

describe('Magento 2 > Workflows', () => {
	const credentials = {
		magento2Api: {
			host: 'https://shop.example.com',
			accessToken: 'fake-access-token',
		},
	};

	beforeAll(() => {
		const mock = nock('https://shop.example.com');
		mock.get('/rest/default/V1/customers/42').reply(200, customer);
		mock.delete('/rest/default/V1/customers/42').reply(200, 'true');
		mock.put('/rest/V1/customers/42').reply(200, customer);
		mock.post('/rest/default/V1/order/1001/invoice').reply(200, '"5"');
		mock.get('/rest/default/V1/orders/1001').reply(200, order);
		mock.post('/rest/default/V1/orders/1001/cancel').reply(200, 'true');
		mock.post('/rest/default/V1/order/1001/ship').reply(200, '"3"');
		mock.get('/rest/default/V1/products/24-MB01').reply(200, product);
		mock.delete('/rest/default/V1/products/24-MB01').reply(200, 'true');
		mock.put('/rest/default/V1/products/24-MB01').reply(200, product);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
