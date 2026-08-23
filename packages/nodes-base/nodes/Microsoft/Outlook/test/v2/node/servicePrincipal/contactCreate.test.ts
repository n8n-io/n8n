import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, Service Principal => contact:create', () => {
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
			.post('/v1.0/users/user%40example.com/contacts', { givenName: 'User', surname: 'Name' })
			.reply(200, {
				id: 'contact-id-1',
				displayName: 'User Name',
				givenName: 'User',
				surname: 'Name',
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['contactCreate.workflow.json'],
	});
});
