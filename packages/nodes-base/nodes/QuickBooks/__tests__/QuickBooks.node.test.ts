import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('QuickBooks customer listing', () => {
	let api: nock.Scope;

	beforeEach(() => {
		api = nock('https://quickbooks.api.intuit.com')
			.get('/v3/company/123/query')
			.query({ query: 'SELECT COUNT(*) FROM customer' })
			.optionally()
			.reply(200, { QueryResponse: { totalCount: 3000 } })
			.get('/v3/company/123/query')
			.query({
				query:
					'SELECT * FROM customer WHERE Active = true ORDERBY Id MAXRESULTS 1000 STARTPOSITION 1',
			})
			.reply(200, { QueryResponse: { Customer: [{ Id: '1' }, { Id: '2' }], maxResults: 2 } })
			.get('/v3/company/123/query')
			.query({
				query:
					'SELECT * FROM customer WHERE Active = true ORDERBY Id MAXRESULTS 1000 STARTPOSITION 1001',
			})
			.optionally()
			.reply(200, { QueryResponse: {} });
	});

	afterEach(() => nock.cleanAll());

	new NodeTestHarness().setupTests({
		credentials: {
			quickBooksOAuth2Api: {
				environment: 'production',
				oauthTokenData: {
					access_token: 'test-access-token',
					callbackQueryString: { realmId: '123' },
				},
			},
		},
		workflowFiles: ['customer-get-all-filtered.workflow.json'],
		customAssertions: () => expect(api.isDone()).toBe(true),
	});
});
