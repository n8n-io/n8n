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

describe('Microsoft Excel (SharePoint), Service Principal table => getRows smoke', () => {
	const tablePath =
		'/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/tables/Table1';

	nock('https://graph.microsoft.com')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(`${tablePath}/rows`)
		.query({ $top: '10' })
		.reply(200, { value: [{ index: 0, values: [['Frank', 'frank@example.com']] }] })
		.get(`${tablePath}/columns`)
		.query({ $select: 'name', $top: '100' })
		.reply(200, { value: [{ name: 'Name' }, { name: 'Email' }] });

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['tableGetRows.sp.workflow.json'],
	});
});
