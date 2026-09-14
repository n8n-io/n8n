import { NodeTestHarness } from '@nodes-testing/node-test-harness';

const workbookRoot = '/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123';

const credentials = {
	microsoftOAuth2Api: {
		oauthTokenData: {
			access_token: 'test-access-token',
		},
		graphApiBaseUrl: 'https://graph.microsoft.com',
	},
};

// Delete removes the file itself — no workbook session tail, unlike Add Sheet.
describe('Microsoft Excel (SharePoint) Node', () => {
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['deleteWorkbook.workflow.json'],
		nock: {
			baseUrl: 'https://graph.microsoft.com',
			mocks: [
				{
					method: 'delete',
					path: workbookRoot,
					statusCode: 204,
					responseBody: '',
				},
			],
		},
	});
});
