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

describe('Microsoft Excel (SharePoint), Service Principal table => append smoke', () => {
	const workbookRoot =
		'/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123/workbook';

	nock('https://graph.microsoft.com')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(`${workbookRoot}/tables/Table1/columns`)
		.query({ $select: 'name', $top: '100' })
		.reply(200, { value: [{ name: 'Name' }, { name: 'Email' }] })
		.post(`${workbookRoot}/createSession`, { persistChanges: true })
		.reply(201, { id: 'session-1' })
		.post(`${workbookRoot}/tables/Table1/rows/add`, {
			values: [['Frank', 'frank@example.com']],
		})
		.matchHeader('workbook-session-id', 'session-1')
		.reply(201, { index: 0, values: [['Frank', 'frank@example.com']] })
		.post(`${workbookRoot}/closeSession`)
		.reply(204);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['tableAppend.sp.workflow.json'],
	});
});
