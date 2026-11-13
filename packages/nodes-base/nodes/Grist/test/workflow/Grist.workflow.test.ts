import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const doc = '/api/docs/pS6pXwGCmSkJ';

describe('Grist > Workflows', () => {
	const credentials = {
		gristApi: {
			apiKey: 'fake-api-key',
			url: 'https://docs.getgrist.com',
		},
	};

	beforeAll(() => {
		const api = nock('https://docs.getgrist.com').matchHeader(
			'authorization',
			'Bearer fake-api-key',
		);

		api
			.get(`${doc}/tables/Contacts/records`)
			.reply(200, { records: [{ id: 1, fields: { Name: 'Ada' } }] });
		api
			.post(`${doc}/tables/Leads/records`, { records: [{ fields: { Name: 'Ada' } }] })
			.reply(200, { records: [{ id: 7 }] });
		api
			.patch(`${doc}/tables/People/records`, { records: [{ id: 7, fields: { Name: 'Grace' } }] })
			.reply(200, {});
		api.post(`${doc}/tables/People/data/delete`, [7]).reply(200, {});
		api
			.put(`${doc}/tables/Accounts/records`, {
				records: [{ require: { Email: 'ada@example.com' }, fields: { Name: 'Ada' } }],
			})
			.reply(200, { recordIds: [[9]] });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
