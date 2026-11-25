import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const lead = 'adf21080-0e10-11eb-879b-05d71fb426ec';

const ok = (data: unknown) => ({ success: true, data });

describe('Pipedrive v1 > Workflows', () => {
	const credentials = { pipedriveApi: { apiToken: 'test-api-token' } };

	beforeAll(() => {
		const mock = nock('https://api.pipedrive.com/v1');
		for (const [plural, id] of [
			['activities', 101],
			['deals', 202],
			['notes', 303],
			['organizations', 404],
			['persons', 505],
			['files', 606],
		] as const) {
			mock.get(`/${plural}/${id}`).query(true).reply(200, ok({ id }));
			mock.delete(`/${plural}/${id}`).query(true).reply(200, ok({ id }));
			mock.put(`/${plural}/${id}`).query(true).reply(200, ok({ id }));
		}
		mock
			.get(`/leads/${lead}`)
			.query(true)
			.reply(200, ok({ id: lead }));
		mock
			.delete(`/leads/${lead}`)
			.query(true)
			.reply(200, ok({ id: lead }));
		mock
			.patch(`/leads/${lead}`, { title: 'Acme Corp lead' })
			.query(true)
			.reply(200, ok({ id: lead }));
		mock
			.post('/deals/202/duplicate')
			.query(true)
			.reply(200, ok({ id: 203 }));
		mock.get('/dealFields').query(true).reply(200, ok([]));
		mock
			.get('/deals/207')
			.query(true)
			.reply(200, ok({ id: 207 }));
		mock
			.get('/deals/202/activities')
			.query((q) => q.limit === '5')
			.reply(200, ok([{ id: 101 }]));
		mock
			.get('/deals/202/products')
			.query(true)
			.reply(200, ok([{ id: 7 }]));
		mock
			.post('/deals/202/products', { product_id: 11, item_price: 20, quantity: 2 })
			.query(true)
			.reply(200, ok({ id: 7 }));
		mock
			.put('/deals/202/products/7', { quantity: 3 })
			.query(true)
			.reply(200, ok({ id: 7 }));
		mock
			.delete('/deals/202/products/7')
			.query(true)
			.reply(200, ok({ id: 7 }));
		mock.get('/files/606/download').query(true).reply(200, Buffer.from('Acme Corp'));
		mock
			.post('/activities', { subject: 'Call Acme Corp', done: '0', type: 'call' })
			.query(true)
			.reply(200, ok({ id: 102 }));
		mock
			.get('/products')
			.query((q) => q.start === '0' && q.limit === '100')
			.reply(200, {
				...ok([{ id: 11 }]),
				additional_data: { pagination: { more_items_in_collection: false } },
			});
		mock
			.get('/persons/search')
			.query((q) => q.term === 'Nathan' && q.limit === '2')
			.reply(200, ok({ items: [{ result_score: 1, item: { id: 505 } }] }));
	});

	afterAll(() => expect(nock.pendingMocks()).toEqual([]));

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
