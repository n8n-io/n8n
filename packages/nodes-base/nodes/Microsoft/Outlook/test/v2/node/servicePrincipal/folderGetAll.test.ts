import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, Service Principal => folder:getAll', () => {
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
			.get('/v1.0/users/user%40example.com/mailFolders')
			.query({ $top: 50 })
			.reply(200, {
				value: [
					{
						id: 'folder-inbox',
						displayName: 'Inbox',
						parentFolderId: 'msgfolderroot',
						childFolderCount: 0,
						unreadItemCount: 3,
						totalItemCount: 10,
					},
				],
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['folderGetAll.workflow.json'],
	});
});
