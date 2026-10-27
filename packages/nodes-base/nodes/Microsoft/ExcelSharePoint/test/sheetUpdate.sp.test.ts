import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	microsoftEntraServicePrincipalApi: {
		accessToken: 'test-access-token',
		authentication: 'clientSecret',
		tenantId: '11111111-1111-1111-1111-111111111111',
		clientId: '22222222-2222-2222-2222-222222222222',
		clientSecret: 'test-client-secret',
		graphApiBaseUrl: 'https://graph.microsoft.com',
	},
};

describe('Microsoft Excel (SharePoint), Service Principal worksheet => update smoke', () => {
	const sheetPath =
		'/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/worksheets/Sheet1';

	nock('https://graph.microsoft.com')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(`${sheetPath}/usedRange`)
		.query({ $select: 'address' })
		.reply(200, { address: 'Sheet1!A1:B2' })
		.patch(`${sheetPath}/range(address='A1:B2')`, {
			values: [
				['Name', 'Email'],
				['Franklin', 'frank@example.com'],
			],
		})
		.reply(200, {
			address: 'Sheet1!A1:B2',
			values: [
				['Name', 'Email'],
				['Franklin', 'frank@example.com'],
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['sheetUpdate.sp.workflow.json'],
	});
});
