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

// A pasted workbook address resolves in one call, then the workbook's sheets
// are listed up to the given limit — the parity path with Sheet: Get Rows
describe('Microsoft Excel (SharePoint) Node — Sheet: Get Many', () => {
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['worksheetGetAll.workflow.json'],
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
					path: '/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/worksheets?%24top=10',
					statusCode: 200,
					responseBody: {
						value: [
							{ id: '{00000000-0000-0000-0000-000000000001}', name: 'Sheet1', position: 0 },
							{ id: '{00000000-0000-0000-0000-000000000002}', name: 'Sheet2', position: 1 },
						],
					},
				},
			],
		},
	});
});
