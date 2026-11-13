import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('ProfitWell > Workflows', () => {
	const credentials = { profitWellApi: { accessToken: 'fake-access-token' } };

	beforeAll(() => {
		const mock = nock('https://api.profitwell.com/v2');
		mock.get('/company/settings/').reply(200, { currency: 'usd' });
		mock
			.get('/metrics/monthly')
			.reply(200, { data: { recurring_revenue: [{ date: '2026-01', value: 100 }] } });
		mock
			.get('/metrics/daily')
			.query({ month: '2026-01' })
			.reply(200, { data: { recurring_revenue: [{ date: '2026-01-01', value: 100 }] } });
	});

	afterAll(() => expect(nock.pendingMocks()).toEqual([]));

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
