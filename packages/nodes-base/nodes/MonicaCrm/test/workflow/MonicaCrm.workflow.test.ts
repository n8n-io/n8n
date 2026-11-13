import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const activity = {
	id: 101,
	summary: 'Lunch',
	happened_at: '2024-05-01T00:00:00Z',
	activity_type: { id: 3 },
	attendees: { contacts: [{ id: 303 }] },
};
const call = { id: 202, called_at: '2024-05-01T00:00:00Z', content: 'Catch up' };
const contact = { id: 303, first_name: 'Nathan' };
const contactField = { id: 404, data: 'nathan@example.com' };
const conversation = {
	id: 505,
	contact: { id: 303 },
	messages: [{ id: 606, content: 'Hello', written_at: '2024-05-01', written_by_me: true }],
};
const message = { id: 606, content: 'Hello' };
const journal = { id: 707, title: 'Day', post: 'Notes' };
const note = { id: 808, body: 'Note body', contact: { id: 303 } };
const reminder = {
	id: 909,
	title: 'Call',
	frequency_type: 'one_time',
	frequency_number: 1,
	initial_date: '2024-06-01T00:00:00Z',
	contact: { id: 303 },
};
const tag = { id: 11, name: 'friends' };
const task = { id: 22, title: 'Send gift', completed: false, contact: { id: 303 } };

const records: Array<[string, object]> = [
	['/activities/101', activity],
	['/calls/202', call],
	['/contacts/303', contact],
	['/contactfields/404', contactField],
	['/conversations/505', conversation],
	['/journal/707', journal],
	['/notes/808', note],
	['/reminders/909', reminder],
	['/tags/11', tag],
	['/tasks/22', task],
];

const updatedByGet = new Set([
	'/activities/101',
	'/calls/202',
	'/contacts/303',
	'/journal/707',
	'/notes/808',
	'/reminders/909',
	'/tasks/22',
]);

describe('MonicaCrm > Workflows', () => {
	describe('Cloud-hosted', () => {
		const credentials = {
			monicaCrmApi: { environment: 'cloudHosted', apiToken: 'fake-token' },
		};

		beforeAll(() => {
			const mock = nock('https://app.monicahq.com/api');
			for (const [path, data] of records) {
				mock.delete(path).reply(200, { deleted: true });
				mock.get(path).reply(200, { data });
				mock.put(path).reply(200, { data });
				if (updatedByGet.has(path)) mock.get(path).reply(200, { data });
			}
			mock
				.get('/contact/303/contactfields')
				.query({ page: 1, limit: 100 })
				.reply(200, { data: [contactField], meta: { total: 1 } });
			mock.post('/contacts/303/setTags').reply(200, { data: contact });
			mock.post('/contacts/303/unsetTag').reply(200, { data: contact });
			mock.get('/conversations/505').times(2).reply(200, { data: conversation });
			mock.post('/conversations/505/messages').reply(200, { data: message });
			mock.put('/conversations/505/messages/606').reply(200, { data: message });
		});

		afterAll(() => {
			expect(nock.pendingMocks()).toEqual([]);
			nock.cleanAll();
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['requests.workflow.json'],
		});
	});

	describe('Self-hosted', () => {
		const credentials = {
			monicaCrmApi: {
				environment: 'selfHosted',
				domain: 'https://monica.example.com',
				apiToken: 'fake-token',
			},
		};

		beforeAll(() => {
			nock('https://monica.example.com/api')
				.matchHeader('authorization', 'Bearer fake-token')
				.get('/contacts/303')
				.reply(200, { data: contact });
		});

		afterAll(() => {
			expect(nock.pendingMocks()).toEqual([]);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['requests.self-hosted.workflow.json'],
		});
	});
});
