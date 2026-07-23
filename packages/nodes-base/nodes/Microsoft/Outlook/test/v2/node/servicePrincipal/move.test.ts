import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

// Nested-path interpolation under the SP mailbox: /users/{encoded-mailbox}/messages/{id}/move.
describe('Test MicrosoftOutlookV2, Service Principal => message:move', () => {
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
			.post(
				'/v1.0/users/user%40example.com/messages/AAMkADlhOTA0MTc5LWVtsg5OABGAAAA-message-id=/move',
				{ destinationId: 'AAMkADlhOTA0MTc5LWVtsg5OAAuAAAA-folder-id=' },
			)
			.reply(200, {});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['move.workflow.json'],
	});
});
