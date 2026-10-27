import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// The target RLC accepts expressions, so it must be resolved per input item: the Test
// Data node fans out to two users and each item's read must be rebased onto that item's
// `/users/{id}/drive` root (encoding pin preserved). Consume-once interceptors + empty
// pendingMocks pin the exact request set in both directions.
describe('Test MicrosoftExcelV2, Service Principal worksheet => readRows per-item target', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(
			'/users/jane%40contoso.com/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/usedRange',
		)
		.reply(200, { values: [['row'], ['jane-row']] });

	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(
			'/users/john%40contoso.com/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/usedRange',
		)
		.reply(200, { values: [['row'], ['john-row']] });

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['readRows.sp.perItem.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
