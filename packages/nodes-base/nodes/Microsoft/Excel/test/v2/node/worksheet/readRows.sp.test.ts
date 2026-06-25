import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// Smoke test that de-risks the imperative requestWithAuthentication-through-
// NodeTestHarness path for the app-only Service Principal credential. The harness
// preAuthentication is a no-op, so the token POST never fires — we nock ONLY the
// scoped Graph endpoint and require the Bearer header that the credential's
// `authenticate` attaches from the fixture's accessToken. The request is rebased from
// `/me` onto `/users/{upn}/drive`, proving the app-only routing end to end.
// login.microsoftonline.com is deliberately NOT nocked.
describe('Test MicrosoftExcelV2, Service Principal worksheet => readRows smoke', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(
			'/users/jane%40contoso.com/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/usedRange',
		)
		.reply(200, {
			values: [
				['id', 'name', 'age', 'data'],
				[1, 'Sam', 33, 'data 1'],
				[2, 'Jon', 44, 'data 2'],
				[3, 'Ron', 55, 'data 3'],
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['readRows.sp.workflow.json'],
	});
});
