import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Intercom', () => {
	const credentials = { intercomApi: { apiKey: 'fake-api-key' } };

	const lead = { type: 'contact', id: '5f1a2b3c4d5e6f7a8b9c0d1e', email: 'nathan@n8n.io' };
	const user = { type: 'user', id: '62b5e1d4c8a9f30012345678', email: 'nathan@n8n.io' };
	const company = { type: 'company', id: '6311a7f2e4b0c9001a2b3c4d', name: 'Acme Corp' };

	beforeAll(() => {
		const api = nock('https://api.intercom.io');
		api.post('/contacts').reply(200, lead);
		api.get('/contacts/5f1a2b3c4d5e6f7a8b9c0d1e').reply(200, lead);
		api
			.get('/contacts')
			.query({ per_page: 60 })
			.reply(200, { contacts: [lead], pages: { next: null } });
		api.delete('/contacts/5f1a2b3c4d5e6f7a8b9c0d1e').reply(200, { ...lead, deleted: true });
		api
			.delete('/contacts')
			.query({ user_id: 'usr-1001' })
			.reply(200, { ...lead, deleted: true });
		api.get('/users/62b5e1d4c8a9f30012345678').reply(200, user);
		api
			.get('/users')
			.query({ per_page: 5 })
			.reply(200, { users: [user] });
		api.delete('/users/62b5e1d4c8a9f30012345678').reply(200, user);
		api.get('/companies/6311a7f2e4b0c9001a2b3c4d').reply(200, company);
		api
			.get('/companies/6311a7f2e4b0c9001a2b3c4d/users')
			.query({ per_page: 5 })
			.reply(200, { users: [user] });
		api
			.get('/companies/6311a7f2e4b0c9001a2b3c4d/users')
			.query({ per_page: 60 })
			.reply(200, {
				users: [user],
				pages: {
					next: 'https://api.intercom.io/companies/6311a7f2e4b0c9001a2b3c4d/users?page=2',
				},
			});
		api
			.get('/companies/6311a7f2e4b0c9001a2b3c4d/users')
			.query({ page: 2, per_page: 60 })
			.reply(200, { users: [{ ...user, id: '62b5e1d4c8a9f30087654321' }], pages: { next: null } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
