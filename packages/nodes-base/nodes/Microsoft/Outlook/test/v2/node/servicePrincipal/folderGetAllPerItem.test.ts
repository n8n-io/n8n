import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

// folder:getAll with includeChildFolders exercises the helper chain end-to-end:
// operation -> microsoftApiRequest AND getSubfolders -> microsoftApiRequestAllItems ->
// (recursive) getSubfolders. Fanning out to two mailboxes proves the loop index is
// threaded through every hop — the child-folder fetch for item i's parent list must hit
// item i's mailbox, not item 0's (which would cross-mix mailboxes). Consume-once
// interceptors + empty pendingMocks pin the exact request set.
describe('Test MicrosoftOutlookV2, Service Principal => folder:getAll per-item mailbox', () => {
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
			.get('/v1.0/users/usera%40example.com/mailFolders')
			.query({ $top: 50 })
			.reply(200, {
				value: [{ id: 'folder-a', displayName: 'Inbox A', childFolderCount: 1 }],
			});

		// childFolderCount > 0 makes getSubfolders recurse into this folder — the child
		// fetch must stay on mailbox A.
		nock('https://graph.microsoft.com')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.get('/v1.0/users/usera%40example.com/mailFolders/folder-a/childFolders')
			.query({ $top: 100 })
			.reply(200, {
				value: [{ id: 'sub-a', displayName: 'Sub A', childFolderCount: 0 }],
			});

		nock('https://graph.microsoft.com')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.get('/v1.0/users/userb%40example.com/mailFolders')
			.query({ $top: 50 })
			.reply(200, {
				value: [{ id: 'folder-b', displayName: 'Inbox B', childFolderCount: 1 }],
			});

		nock('https://graph.microsoft.com')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.get('/v1.0/users/userb%40example.com/mailFolders/folder-b/childFolders')
			.query({ $top: 100 })
			.reply(200, {
				value: [{ id: 'sub-b', displayName: 'Sub B', childFolderCount: 0 }],
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['folderGetAllPerItem.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
