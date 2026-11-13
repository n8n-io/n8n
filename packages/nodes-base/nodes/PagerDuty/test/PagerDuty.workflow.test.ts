import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const incident = {
	id: 'PT4KHLK',
	type: 'incident',
	title: 'Database is down',
	status: 'triggered',
};
const note = { id: 'PWL7QXS', content: 'Restarted the primary node' };
const logEntry = { id: 'R2XGXEI3W0FHMAK', type: 'trigger_log_entry' };
const user = { id: 'PXPGF42', name: 'Nathan', email: 'nathan@example.com' };

describe('PagerDuty > Workflows', () => {
	const credentials = { pagerDutyApi: { apiToken: 'fake-token' } };

	beforeAll(() => {
		const mock = nock('https://api.pagerduty.com');
		mock.post('/incidents').reply(201, { incident });
		mock.get('/incidents/PT4KHLK').reply(200, { incident });
		mock
			.get('/incidents')
			.query({ limit: 1 })
			.reply(200, { incidents: [incident] });
		mock.put('/incidents/PT4KHLK').reply(200, { incident });
		mock.post('/incidents/PT4KHLK/notes').reply(201, { note });
		mock
			.get('/incidents/PT4KHLK/notes')
			.query({ limit: 100, offset: 0 })
			.reply(200, { notes: [note], more: false });
		mock.get('/log_entries/R2XGXEI3W0FHMAK').reply(200, { log_entry: logEntry });
		mock
			.get('/log_entries')
			.query({ limit: 1 })
			.reply(200, { log_entries: [logEntry] });
		mock.get('/users/PXPGF42').reply(200, { user });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
