import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const ticket = { id: 42, subject: 'Printer is broken' };
const suspendedTicket = { id: 43, subject: 'Printer is broken' };
const user = { id: 7, name: 'Nathan' };
const organization = { id: 3, name: 'Acme Corp' };

describe('Zendesk > Workflows', () => {
	const credentials = {
		zendeskApi: {
			subdomain: 'acme',
			email: 'nathan@example.com',
			apiToken: 'fake-api-token',
		},
	};

	beforeAll(() => {
		const api = nock('https://acme.zendesk.com/api/v2');
		api.post('/tickets.json').reply(200, { ticket });
		api.get('/tickets/42.json').reply(200, { ticket });
		api.get('/suspended_tickets/43.json').reply(200, { suspended_ticket: suspendedTicket });
		api.put('/tickets/42.json').reply(200, { ticket });
		api.delete('/tickets/42.json').reply(204);
		api.delete('/suspended_tickets/43.json').reply(204);
		api.put('/suspended_tickets/43/recover.json').reply(200, { ticket });
		api.get('/ticket_fields/360001.json').reply(200, { ticket_field: { id: 360001 } });
		api.get('/users/7.json').reply(200, { user });
		api.put('/users/7.json').reply(200, { user });
		api.delete('/users/7.json').reply(200, { user });
		api.get('/users/7/organizations.json').reply(200, { organizations: [organization] });
		api.get('/users/7/related.json').reply(200, { user_related: { tickets: 1 } });
		api.get('/users.json').reply(200, {
			users: [user],
			next_page: 'https://acme.zendesk.com/api/v2/users.json?page=2',
		});
		api
			.get('/users.json')
			.query({ page: 2 })
			.reply(200, { users: [{ id: 8, name: 'Jan' }], next_page: null });
		api.get('/organizations/3.json').reply(200, { organization });
		api.put('/organizations/3.json').reply(200, { organization });
		api.delete('/organizations/3.json').reply(204);
		api
			.get('/organizations/3/related.json')
			.reply(200, { organization_related: { tickets_count: 2 } });
		api.get('/organizations/count.json').reply(200, { count: { value: 1 } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
