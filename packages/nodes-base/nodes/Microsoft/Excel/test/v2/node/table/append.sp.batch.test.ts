import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// Pins the whole-batch rule: table:append sends ONE request-set for all input items and
// reads every param at item 0 — so even with per-item target expressions that differ,
// all four session requests go to item 0's (alice's) root. Bob's root is never mocked,
// so any request there fails (disableNetConnect); empty pendingMocks pins the exact set.
describe('Test MicrosoftExcelV2, Service Principal table => append uses item 0 target for the whole batch', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(
			'/users/alice%40contoso.com/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/tables/%7B317CA469-7D1C-4A5D-9B0B-424444BF0336%7D/columns',
		)
		.reply(200, { value: [{ name: 'row' }] });

	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.post(
			'/users/alice%40contoso.com/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/createSession',
			{
				persistChanges: true,
			},
		)
		.reply(200, { id: 'session-1' });

	// Both items' rows land in ONE add call under alice's root.
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.matchHeader('workbook-session-id', 'session-1')
		.post(
			'/users/alice%40contoso.com/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/tables/%7B317CA469-7D1C-4A5D-9B0B-424444BF0336%7D/rows/add',
			{ values: [['r1'], ['r2']] },
		)
		.reply(200, { index: 0, values: [['r1'], ['r2']] });

	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.matchHeader('workbook-session-id', 'session-1')
		.post(
			'/users/alice%40contoso.com/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/closeSession',
			{},
		)
		.reply(200);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['append.sp.batch.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
