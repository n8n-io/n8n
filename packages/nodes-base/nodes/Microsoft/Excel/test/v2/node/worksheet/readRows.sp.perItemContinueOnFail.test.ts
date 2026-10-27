import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// Per-item error isolation under continueOnFail: item 0's bogus target ("not a user"
// fails the shape validators) must produce an error item for item 0 only, while item 1
// still reads from its own user's drive. Only jane is mocked; consume-once + empty
// pendingMocks pin the exact request set.
describe('Test MicrosoftExcelV2, Service Principal worksheet => readRows fails only the bad item under continueOnFail', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(
			'/users/jane%40contoso.com/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/usedRange',
		)
		.reply(200, { values: [['row'], ['jane-row']] });

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['readRows.sp.perItemContinueOnFail.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
