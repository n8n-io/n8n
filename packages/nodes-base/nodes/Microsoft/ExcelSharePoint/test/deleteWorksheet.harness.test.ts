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

// Delete removes the sheet
describe('Microsoft Excel (SharePoint) Node — Sheet: Delete', () => {
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['deleteWorksheet.workflow.json'],
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
					method: 'delete',
					path: '/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/worksheets/Sheet1',
					statusCode: 200,
					responseBody: {},
				},
			],
		},
	});
});
