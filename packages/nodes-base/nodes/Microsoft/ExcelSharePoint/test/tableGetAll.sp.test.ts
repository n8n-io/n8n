import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

// SP smoke test: site/library/workbook by ID, signed in as the Service Principal
// (app-only) credential. preAuthentication is a no-op in the harness since the
// fixture already carries an accessToken, so `authenticate` attaches Bearer directly.
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

describe('Microsoft Excel (SharePoint), Service Principal table => getAll smoke', () => {
	nock('https://graph.microsoft.com')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(
			'/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/tables',
		)
		.query({ $top: '10' })
		.reply(200, {
			value: [{ id: '{00000000-0000-0000-0000-000000000011}', name: 'Table1' }],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['tableGetAll.sp.workflow.json'],
	});
});
