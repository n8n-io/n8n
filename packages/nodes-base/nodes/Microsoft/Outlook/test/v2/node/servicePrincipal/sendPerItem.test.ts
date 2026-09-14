import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

// The mailbox RLC accepts expressions, so it must be resolved per input item: a fan-out
// to two mailboxes must produce one /users/{encoded-mailbox}/sendMail POST per mailbox.
// Both interceptors are consume-once and `pendingMocks` must be empty afterwards, so a
// run that sends both items from item 0's mailbox fails in either direction.
describe('Test MicrosoftOutlookV2, Service Principal => message:send per-item mailbox', () => {
	const credentials = {
		microsoftEntraServicePrincipalApi: {
			accessToken: 'test-access-token',
			tenantId: '11111111-1111-1111-1111-111111111111',
			clientId: '22222222-2222-2222-2222-222222222222',
			clientSecret: 'secret',
			graphApiBaseUrl: 'https://graph.microsoft.com',
		},
	};

	const expectedBody = {
		message: {
			body: { content: 'message description', contentType: 'Text' },
			subject: 'Hello',
			toRecipients: [{ emailAddress: { address: 'to@mail.com' } }],
		},
		saveToSentItems: true,
	};

	beforeAll(() => {
		nock('https://graph.microsoft.com')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.post('/v1.0/users/alice%40example.com/sendMail', expectedBody)
			.reply(200, {});

		nock('https://graph.microsoft.com')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.post('/v1.0/users/bob%40example.com/sendMail', expectedBody)
			.reply(200, {});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['sendPerItem.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
