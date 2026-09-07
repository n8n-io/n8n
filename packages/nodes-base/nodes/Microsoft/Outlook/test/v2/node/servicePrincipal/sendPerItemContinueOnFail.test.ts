import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

// Per-item error isolation under continueOnFail: item 0's bogus mailbox ("contoso.com"
// is a bare host, not a GUID/UPN) must route through the router's continueOnFail branch
// as an error item for item 0 only, while items 1 and 2 still send from their own
// mailboxes. Only the two valid mailboxes are mocked; consume-once + empty pendingMocks
// pin the exact request set.
describe('Test MicrosoftOutlookV2, Service Principal => message:send fails only the bad item under continueOnFail', () => {
	const credentials = {
		microsoftEntraServicePrincipalApi: {
			accessToken: 'test-access-token',
			tenantId: '11111111-1111-1111-1111-111111111111',
			clientId: '22222222-2222-2222-2222-222222222222',
			clientSecret: 'secret',
			graphApiBaseUrl: 'https://graph.microsoft.com',
		},
	};

	beforeAll(() => {
		nock('https://graph.microsoft.com')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.post('/v1.0/users/alice%40example.com/sendMail')
			.reply(200, {});

		nock('https://graph.microsoft.com')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.post('/v1.0/users/bob%40example.com/sendMail')
			.reply(200, {});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['sendPerItemContinueOnFail.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
