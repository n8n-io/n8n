import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const client = { id: 12, name: 'Acme Corp' };
const site = { id: 34, name: 'Head Office', client_id: 12 };
const ticket = { id: 56, summary: 'Printer is broken' };
const user = { id: 78, name: 'Nathan Smith', site_id: 34 };

describe('HaloPSA > Workflows', () => {
	const credentials = {
		haloPSAApi: {
			hostingType: 'hostedHalo',
			authUrl: 'https://acme.halopsa.com/auth',
			resourceApiUrl: 'https://acme.halopsa.com/api',
			client_id: 'fake-client-id',
			client_secret: 'fake-client-secret',
			tenant: 'acme',
			scope: 'admin edit:tickets edit:customers',
		},
	};

	beforeAll(() => {
		nock('https://acme.halopsa.com/auth')
			.post('/token', {
				client_id: 'fake-client-id',
				client_secret: 'fake-client-secret',
				grant_type: 'client_credentials',
				scope: 'admin edit:tickets edit:customers',
			})
			.query({ tenant: 'acme' })
			.times(20)
			.reply(200, { access_token: 'fake-access-token', token_type: 'Bearer', expires_in: 3600 });

		const api = nock('https://acme.halopsa.com/api')
			.replyContentLength()
			.matchHeader('authorization', 'Bearer fake-access-token');
		api.post('/client', [{ name: 'Acme Corp' }]).reply(200, client);
		api.get('/client/12').reply(200, client);
		api
			.get('/client')
			.query({ count: 2 })
			.reply(200, { clients: [client] });
		api.post('/client', [{ id: '12' }]).reply(200, client);
		api.delete('/client/12').reply(200, client);
		api.post('/site', [{ name: 'Head Office', client_id: '12' }]).reply(200, site);
		api.get('/site/34').reply(200, site);
		api
			.get('/site')
			.query({ count: 2 })
			.reply(200, { sites: [site] });
		api.post('/site', [{ id: '34' }]).reply(200, site);
		api.delete('/site/34').reply(200, site);
		api
			.post('/tickets', [
				{ tickettype_id: '1', summary: 'Printer is broken', details: 'Paper jam' },
			])
			.reply(200, ticket);
		api.get('/tickets/56').reply(200, ticket);
		api
			.get('/tickets')
			.query({ count: 2 })
			.reply(200, { tickets: [ticket] });
		api.post('/tickets', [{ id: '56' }]).reply(200, ticket);
		api.delete('/tickets/56').reply(200, ticket);
		api.post('/users', [{ name: 'Nathan Smith', site_id: '34' }]).reply(200, user);
		api.get('/users/78').reply(200, user);
		api
			.get('/users')
			.query({ count: 2 })
			.reply(200, { users: [user] });
		api.post('/users', [{ id: '78' }]).reply(200, user);
		api.delete('/users/78').reply(200, user);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
