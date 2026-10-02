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

describe('Microsoft Excel (SharePoint), Service Principal workbook => getAll smoke', () => {
	nock('https://graph.microsoft.com')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(
			"/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/root/search(q='.xlsx%20OR%20.xlsm')",
		)
		.query({ $top: '10' })
		.reply(200, {
			value: [
				{ id: 'wb1', name: 'Budget.xlsx', file: {} },
				{ id: 'doc1', name: 'Notes.docx', file: {} },
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['workbookGetAll.sp.workflow.json'],
	});
});
