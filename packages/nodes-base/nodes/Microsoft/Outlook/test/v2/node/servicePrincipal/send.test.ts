import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

// Asserts both the rewritten /users/{encoded-mailbox}/sendMail URL and the request body shape.
describe('Test MicrosoftOutlookV2, Service Principal => message:send', () => {
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
			.post('/v1.0/users/user%40example.com/sendMail', {
				message: {
					body: { content: 'message description', contentType: 'Text' },
					replyTo: [{ emailAddress: { address: 'reply@mail.com' } }],
					subject: 'Hello',
					toRecipients: [{ emailAddress: { address: 'to@mail.com' } }],
				},
				saveToSentItems: true,
			})
			.reply(200, {});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['send.workflow.json'],
	});
});
