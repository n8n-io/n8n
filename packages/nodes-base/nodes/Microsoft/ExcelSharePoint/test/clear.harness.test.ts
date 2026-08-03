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

const shareLookupMock = {
	method: 'get' as const,
	path: `/v1.0/shares/${shareId}/driveItem?%24select=id%2CparentReference`,
	statusCode: 200,
	responseBody: {
		id: 'ITEM123',
		parentReference: {
			siteId: 'contoso.sharepoint.com,g1,g2',
			driveId: 'b!drive1',
		},
	},
};

// Clear without a range matches the OneDrive node's whole-sheet path
describe('Microsoft Excel (SharePoint) Node — Sheet: Clear (whole sheet)', () => {
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['clear.workflow.json'],
		nock: {
			baseUrl: 'https://graph.microsoft.com',
			mocks: [
				shareLookupMock,
				{
					method: 'post',
					path: '/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/worksheets/Sheet1/range/clear',
					statusCode: 200,
					requestBody: { applyTo: 'All' },
					responseBody: {},
				},
			],
		},
	});
});

// Clear with a range, and a non-default Apply To choice reaching the API
describe('Microsoft Excel (SharePoint) Node — Sheet: Clear (with range)', () => {
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['clear-with-range.workflow.json'],
		nock: {
			baseUrl: 'https://graph.microsoft.com',
			mocks: [
				shareLookupMock,
				{
					method: 'post',
					path: `/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/worksheets/Sheet1/range(address='${encodeURIComponent('A1:B2')}')/clear`,
					statusCode: 200,
					requestBody: { applyTo: 'Contents' },
					responseBody: {},
				},
			],
		},
	});
});
