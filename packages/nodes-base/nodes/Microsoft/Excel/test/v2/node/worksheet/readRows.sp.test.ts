import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// SP smoke test: asserts the /me → /users/{upn}/drive rebase end to end. Nock only the
// scoped Graph endpoint (Bearer from the fixture); preAuthentication is a no-op in the harness.
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
