import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const user = { id: 7, firstname: 'Nathan', login: 'nathan@example.com' };
const organization = { id: 3, name: 'Acme Corp' };
const group = { id: 2, name: 'Support' };
const ticket = { id: 42, title: 'Printer is broken' };
const articles = [{ id: 101, ticket_id: 42, body: 'Printer is broken' }];

describe('Zammad > Workflows', () => {
	const credentials = {
		zammadTokenAuthApi: {
			baseUrl: 'https://helpdesk.example.com/',
			accessToken: 'fake-access-token',
			allowUnauthorizedCerts: false,
		},
		zammadBasicAuthApi: {
			baseUrl: 'https://basic.helpdesk.example.com',
			username: 'nathan',
			password: 'fake-password',
			allowUnauthorizedCerts: false,
		},
	};

	beforeAll(() => {
		const token = nock('https://helpdesk.example.com/api/v1').matchHeader(
			'authorization',
			'Token token=fake-access-token',
		);
		token.get('/users/7').reply(200, user);
		token.put('/users/7', { note: 'VIP' }).reply(200, user);
		token.delete('/users/7').reply(200, {});
		token.get('/organizations/3').reply(200, organization);
		token.put('/organizations/3', { note: 'Key account' }).reply(200, organization);
		token.delete('/organizations/3').reply(200, {});
		token.get('/groups/2').reply(200, group);
		token.put('/groups/2', { note: 'First line' }).reply(200, group);
		token.delete('/groups/2').reply(200, {});
		token.get('/tickets/42').reply(200, ticket);
		token.get('/ticket_articles/by_ticket/42').reply(200, articles);
		token.delete('/tickets/42').reply(200, {});

		nock('https://basic.helpdesk.example.com/api/v1')
			.matchHeader(
				'authorization',
				`Basic ${Buffer.from('nathan:fake-password').toString('base64')}`,
			)
			.get('/users/me')
			.reply(200, user);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
