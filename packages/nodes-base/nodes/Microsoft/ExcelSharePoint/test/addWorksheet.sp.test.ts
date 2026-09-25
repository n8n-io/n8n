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

describe('Microsoft Excel (SharePoint), Service Principal workbook => addWorksheet smoke', () => {
	nock('https://graph.microsoft.com')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.post(
			'/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/createSession',
			{ persistChanges: true },
		)
		.reply(200, { id: 'session-abc' })
		.post(
			'/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/worksheets/add',
			{ name: 'Q4 Report' },
		)
		.matchHeader('workbook-session-id', 'session-abc')
		.reply(200, {
			id: '{266ADAB7-25B6-4F28-A2D1-FD5BFBD7A4F0}',
			name: 'Q4 Report',
			position: 1,
		})
		.post(
			'/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook/closeSession',
		)
		.matchHeader('workbook-session-id', 'session-abc')
		.reply(200, {});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['addWorksheet.sp.workflow.json'],
	});
});
