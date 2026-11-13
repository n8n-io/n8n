import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Stackby', () => {
	const credentials = {
		stackbyApi: { apiKey: 'test-api-key' },
	};

	describe('Run workflow', () => {
		beforeAll(() => {
			const mock = nock('https://stackby.com/api/betav1');
			mock
				.get('/rowlist/stQ7JA1JBbbbcCVc/Sales%20Leads')
				.query({ rowIds: ['rw1655131325dd7d4cd7'] })
				.reply(200, [{ id: 'rw1655131325dd7d4cd7', field: { name: 'Nathan' } }]);
			mock
				.delete('/rowdelete/stQ7JA1JBbbbcCVc/Sales%20Leads')
				.query({ rowIds: ['rw1655131325dd7d4cd7'] })
				.reply(200, { records: [{ id: 'rw1655131325dd7d4cd7', deleted: true }] });
			mock
				.get('/rowlist/stQ7JA1JBbbbcCVc/Sales%20Leads')
				.query({ maxrecord: 2 })
				.reply(200, [{ field: { name: 'Nathan' } }, { field: { name: 'Jan' } }]);
			mock
				.post('/rowcreate/stQ7JA1JBbbbcCVc/Sales%20Leads', {
					records: [{ field: { name: 'Nathan' } }],
				})
				.reply(200, [{ id: 'rw1655131325dd7d4cd8', field: { name: 'Nathan' } }]);
		});

		afterAll(() => {
			expect(nock.pendingMocks()).toEqual([]);
		});

		new NodeTestHarness().setupTests({ credentials });
	});
});
