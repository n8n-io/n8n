import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const SELECT = 'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments';

// The transport encodes the mailbox once, so the outgoing path carries `user%40example.com`.
// login.microsoftonline.com is deliberately left un-nocked: the harness no-ops
// preAuthentication, so any accidental real token mint would fail this test.
describe('Test MicrosoftOutlookV2, Service Principal => message:getAll (paginated)', () => {
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
		const page2Url =
			'https://graph.microsoft.com/v1.0/users/user%40example.com/messages?$select=' +
			encodeURIComponent(SELECT) +
			'&$skip=1';

		nock('https://graph.microsoft.com')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.get('/v1.0/users/user%40example.com/messages')
			.query({ $select: SELECT, $top: 100 })
			.reply(200, {
				'@odata.nextLink': page2Url,
				value: [
					{
						id: 'msg-page1',
						conversationId: 'conv-1',
						subject: 'Page 1 Email',
						bodyPreview: 'first page',
						from: { emailAddress: { name: 'John Doe', address: 'john.doe@example.com' } },
						toRecipients: [
							{ emailAddress: { name: 'Jane Smith', address: 'jane.smith@example.com' } },
						],
						categories: [],
						hasAttachments: false,
					},
				],
			});

		// Page 2 is fetched verbatim from the nextLink (no re-prefixing of /users/{mailbox}).
		nock('https://graph.microsoft.com')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.get('/v1.0/users/user%40example.com/messages')
			.query({ $select: SELECT, $skip: 1 })
			.reply(200, {
				value: [
					{
						id: 'msg-page2',
						conversationId: 'conv-2',
						subject: 'Page 2 Email',
						bodyPreview: 'second page',
						from: { emailAddress: { name: 'Alice', address: 'alice@example.com' } },
						toRecipients: [{ emailAddress: { name: 'Bob', address: 'bob@example.com' } }],
						categories: [],
						hasAttachments: false,
					},
				],
			});
	});

	const harness = new NodeTestHarness();

	harness.setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json'],
	});

	// The harness compares the live two-page merge against pinData; assert the
	// expected merge contract explicitly (exactly 2 items, page 1 then page 2).
	it('merges both pages into 2 items in page order', () => {
		const workflow = harness.readWorkflowJSON('getAll.workflow.json');
		const output = workflow.pinData?.['Microsoft Outlook'] ?? [];

		expect(output).toHaveLength(2);
		expect(output.map((item) => item.json.id)).toEqual(['msg-page1', 'msg-page2']);
		expect(output.map((item) => item.json.subject)).toEqual(['Page 1 Email', 'Page 2 Email']);
	});
});
