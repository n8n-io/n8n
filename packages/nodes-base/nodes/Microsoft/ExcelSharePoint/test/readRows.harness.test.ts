import { NodeTestHarness } from '@nodes-testing/node-test-harness';

const workbookUrl = 'https://contoso.sharepoint.com/sites/site1/Shared Documents/book.xlsx';
const shareId = `u!${Buffer.from(workbookUrl)
	.toString('base64')
	.replace(/=+$/, '')
	.replace(/\+/g, '-')
	.replace(/\//g, '_')}`;

const credentials = {
	microsoftOAuth2Api: {
		oauthTokenData: {
			access_token: 'test-access-token',
		},
		graphApiBaseUrl: 'https://graph.microsoft.com',
	},
};

// A pasted workbook address resolves in one call, then rows are read and
// parsed into objects — the parity path with the OneDrive node's Get Rows
describe('Microsoft Excel (SharePoint) Node', () => {
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['readRows.workflow.json'],
		nock: {
			baseUrl: 'https://graph.microsoft.com',
			mocks: [
				{
					method: 'get',
					path: `/v1.0/shares/${shareId}/driveItem?%24select=id%2CparentReference`,
					statusCode: 200,
					responseBody: {
						id: 'ITEM123',
						parentReference: {
							siteId: 'contoso.sharepoint.com,g1,g2',
							driveId: 'b!drive1',
						},
					},
				},
				{
					method: 'get',
					path: '/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/worksheets/Sheet1/usedRange',
					statusCode: 200,
					responseBody: {
						address: 'Sheet1!A1:B2',
						values: [
							['name', 'age'],
							['alice', 30],
						],
					},
				},
			],
		},
	});
});
