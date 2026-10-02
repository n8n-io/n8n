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

describe('Microsoft Excel (SharePoint), Service Principal table => create smoke', () => {
	nock('https://graph.microsoft.com')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.post(
			'/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/worksheets/Sheet1/tables/add',
			{ address: 'A1:B2', hasHeaders: true },
		)
		.reply(201, { id: '{T9}', name: 'Table9' });

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['tableCreate.sp.workflow.json'],
	});
});
