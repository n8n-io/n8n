import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

// draft:send issues a PATCH then a POST, both under /users/{encoded-mailbox}.
describe('Test MicrosoftOutlookV2, Service Principal => draft:send', () => {
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
			.patch('/v1.0/users/user%40example.com/messages/AAMkADlhOTA0MTc5-draft-id=', {
				toRecipients: [{ emailAddress: { address: 'michael.k@radency.com' } }],
			})
			.reply(200)
			.post('/v1.0/users/user%40example.com/messages/AAMkADlhOTA0MTc5-draft-id=/send')
			.reply(200);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['draftSend.workflow.json'],
	});
});
