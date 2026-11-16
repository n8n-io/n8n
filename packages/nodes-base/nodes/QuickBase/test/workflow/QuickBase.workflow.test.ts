import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('QuickBase > Workflows', () => {
	const credentials = {
		quickbaseApi: {
			hostname: 'acme.quickbase.com',
			userToken: 'fake-user-token',
		},
	};
	const filePath = '/files/bck7gp3q2/12/7/1';

	beforeAll(() => {
		const api = nock('https://api.quickbase.com/v1')
			.matchHeader('qb-realm-hostname', 'acme.quickbase.com')
			.matchHeader('authorization', 'QB-USER-TOKEN fake-user-token');
		api.get('/fields').reply(200, [
			{ id: 6, label: 'Name' },
			{ id: 7, label: 'Email' },
		]);
		api.delete(filePath).reply(200, { versionNumber: 1, fileName: 'report.pdf' });
		api.get(filePath).reply(200, Buffer.from('file content').toString('base64'), {
			'content-disposition': 'attachment; filename=report.pdf',
		});
		api
			.post('/reports/5/run')
			.query({ tableId: 'bck7gp3q2', top: 1 })
			.reply(200, {
				data: [{ 6: { value: 'Ada' } }],
				fields: [{ id: 6, label: 'Name' }],
				metadata: { totalRecords: 1 },
			});
		api
			.get('/reports/5')
			.query({ tableId: 'bck7gp3q2' })
			.reply(200, { id: '5', name: 'List All', type: 'table' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
