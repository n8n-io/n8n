import { NodeTestHarness } from '@nodes-testing/node-test-harness';

const credentials = {
	microsoftOAuth2Api: {
		oauthTokenData: {
			access_token: 'test-access-token',
		},
		graphApiBaseUrl: 'https://graph.microsoft.com',
	},
};

// Site, library, and workbook by ID; the workbook's tables are listed up to
// the given limit — Table: Get Many is new ground beyond the OneDrive node
describe('Microsoft Excel (SharePoint) Node — Table: Get Many', () => {
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['tableGetAll.workflow.json'],
		nock: {
			baseUrl: 'https://graph.microsoft.com',
			mocks: [
				{
					method: 'get',
					path: '/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/tables?%24top=10',
					statusCode: 200,
					responseBody: {
						value: [
							{ id: '{00000000-0000-0000-0000-000000000011}', name: 'Table1' },
							{ id: '{00000000-0000-0000-0000-000000000012}', name: 'Table2' },
						],
					},
				},
			],
		},
	});
});
