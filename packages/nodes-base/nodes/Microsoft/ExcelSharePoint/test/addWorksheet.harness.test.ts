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

// Add Sheet must open, use, and close a workbook session in order — the same
// sequence the OneDrive node performs for the equivalent operation.
describe('Microsoft Excel (SharePoint) Node', () => {
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['addWorksheet.workflow.json'],
		nock: {
			baseUrl: 'https://graph.microsoft.com',
			mocks: [
				{
					method: 'post',
					path: `${workbookRoot}/workbook/createSession`,
					requestBody: { persistChanges: true },
					statusCode: 200,
					responseBody: { id: 'session-abc' },
				},
				{
					method: 'post',
					path: `${workbookRoot}/workbook/worksheets/add`,
					requestBody: { name: 'Q4 Report' },
					requestHeaders: { 'workbook-session-id': 'session-abc' },
					statusCode: 200,
					responseBody: {
						id: '{266ADAB7-25B6-4F28-A2D1-FD5BFBD7A4F0}',
						name: 'Q4 Report',
						position: 1,
					},
				},
				{
					method: 'post',
					path: `${workbookRoot}/workbook/closeSession`,
					requestHeaders: { 'workbook-session-id': 'session-abc' },
					statusCode: 200,
					responseBody: {},
				},
			],
		},
	});
});
