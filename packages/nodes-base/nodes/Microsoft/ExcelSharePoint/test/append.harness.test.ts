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

// A pasted workbook address resolves in one call, then the RAW row lands
// below the sheet's existing data — the parity path with the OneDrive node's Append
describe('Microsoft Excel (SharePoint) — Sheet: Append', () => {
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['append.workflow.json'],
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
				{
					method: 'patch',
					path: "/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/worksheets/Sheet1/range(address='A3:B3')",
					statusCode: 200,
					responseBody: {
						values: [['bob', '25']],
					},
				},
			],
		},
	});
});
