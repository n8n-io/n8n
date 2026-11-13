import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Salesmate > Workflows', () => {
	const credentials = {
		salesmateApi: {
			sessionToken: 'test-session-token',
			url: 'acme.salesmate.io',
		},
	};

	beforeAll(() => {
		const mock = nock('https://apis.salesmate.io');
		mock.post('/v1/companies').reply(200, { Data: { id: 2045 } });
		mock.put('/v1/companies/2045').reply(200, { Data: { id: 2045 } });
		mock.get('/v1/companies/2045').reply(200, { Data: { id: 2045 } });
		mock
			.post('/v2/companies/search')
			.query({ pageNo: 1, rows: 25 })
			.reply(200, { Data: { data: [{ id: 2045 }], totalPages: 1 } });
		mock.delete('/v1/companies/2045').reply(200, { Status: 'success' });
		mock.post('/v1/activities').reply(200, { Data: { id: 3121 } });
		mock.put('/v1/activities/3121').reply(200, { Data: { id: 3121 } });
		mock.get('/v1/activities/3121').reply(200, { Data: { id: 3121 } });
		mock
			.post('/v2/activities/search')
			.query({ rows: 5 })
			.reply(200, { Data: { data: [{ id: 3121 }] } });
		mock.delete('/v1/activities/3121').reply(200, { Status: 'success' });
		mock.post('/v1/deals').reply(200, { Data: { id: 4210 } });
		mock.put('/v1/deals/4210').reply(200, { Data: { id: 4210 } });
		mock.get('/v1/deals/4210').reply(200, { Data: { id: 4210 } });
		mock
			.post('/v2/deals/search')
			.query({ rows: 5 })
			.reply(200, { Data: { data: [{ id: 4210 }] } });
		mock.delete('/v1/deals/4210').reply(200, { Status: 'success' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
