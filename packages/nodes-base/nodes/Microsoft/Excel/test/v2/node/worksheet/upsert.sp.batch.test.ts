import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// Pins the whole-batch rule for worksheet:upsert: one request set for all input items and
// every request-level parameter (including the SP target) is read at item 0 — so even with
// per-item target expressions that differ, all three requests (usedRange read, append-range
// probe, final write) go to item 0's (alice's) root. Bob's root is never mocked, so any
// request there fails (disableNetConnect); empty pendingMocks pins the exact set.
describe('Test MicrosoftExcelV2, Service Principal worksheet => upsert uses item 0 target for the whole batch', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(
			'/users/alice%40contoso.com/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/usedRange',
		)
		.reply(200, {
			address: 'Sheet1!A1:B3',
			values: [
				['id', 'data'],
				['1', 'old1'],
				['2', 'old2'],
			],
		});

	// Item 1 appends, so the node re-reads the used range (address only) — still under alice.
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(
			'/users/alice%40contoso.com/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/usedRange',
		)
		.query({ select: 'address' })
		.reply(200, { address: 'Sheet1!A1:B3' });

	// Both items' rows (item 0's update + item 1's append) land in ONE write under alice's root.
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.patch(
			"/users/alice%40contoso.com/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/range(address='A1:B4')",
			{
				values: [
					['id', 'data'],
					['1', 'new1'],
					['2', 'old2'],
					['3', 'new3'],
				],
			},
		)
		.reply(200, {
			values: [
				['id', 'data'],
				['1', 'new1'],
				['2', 'old2'],
				['3', 'new3'],
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['upsert.sp.batch.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
