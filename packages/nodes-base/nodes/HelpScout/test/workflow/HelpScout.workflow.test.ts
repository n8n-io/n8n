import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('HelpScout > Workflows', () => {
	const credentials = {
		helpScoutOAuth2Api: {
			scope: '',
			oauthTokenData: {
				access_token: 'fake-access-token',
			},
		},
	};

	beforeAll(() => {
		const api = nock('https://api.helpscout.net').matchHeader(
			'authorization',
			'Bearer fake-access-token',
		);
		api
			.post('/v2/conversations')
			.reply(
				201,
				{},
				{ 'resource-id': '1001', location: 'https://api.helpscout.net/v2/conversations/1001' },
			);
		api.get('/v2/conversations/1001').reply(200, { id: 1001, subject: 'Printer is broken' });
		api.delete('/v2/conversations/1001').reply(204, {});
		api.get('/v2/conversations/1001').reply(200, { id: 1001 });
		api
			.get('/v2/conversations')
			.query({ limit: 2 })
			.reply(200, { _embedded: { conversations: [{ id: 1001 }] } });
		api.get('/v2/conversations').reply(200, {
			_embedded: { conversations: [{ id: 1001 }] },
			_links: { next: { href: 'https://api.helpscout.net/v2/conversations?page=2' } },
		});
		api
			.get('/v2/conversations')
			.query({ page: 2 })
			.reply(200, { _embedded: { conversations: [{ id: 1002 }] } });
		api
			.post('/v2/customers')
			.reply(
				201,
				{},
				{ 'resource-id': '501', location: 'https://api.helpscout.net/v2/customers/501' },
			);
		api
			.get('/v2/customer-properties')
			.reply(200, { _embedded: { 'customer-properties': [{ slug: 'plan' }] } });
		api.get('/v2/customers/501').reply(200, { id: 501 });
		api
			.get('/v2/customers')
			.query({ limit: 2 })
			.reply(200, { _embedded: { customers: [{ id: 501 }] } });
		api.put('/v2/customers/501').reply(204, {});
		api.get('/v2/mailboxes/321').reply(200, { id: 321 });
		api
			.get('/v2/mailboxes')
			.query({ limit: 2 })
			.reply(200, { _embedded: { mailboxes: [{ id: 321 }] } });
		api.post('/v2/conversations/1001/notes').reply(201, {});
		api
			.get('/v2/conversations/1001/threads')
			.reply(200, { _embedded: { threads: [{ id: 9001 }] } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
