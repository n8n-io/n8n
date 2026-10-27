import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// Drive-mode per-item resolution: with `Access As: Drive` the target id IS the drive,
// addressed as `/drives/{id}` (no `/drive` suffix). Two items with distinct drive-id
// expressions must each read from their own drive root. Consume-once + empty
// pendingMocks pin the exact request set.
describe('Test MicrosoftExcelV2, Service Principal worksheet => readRows per-item drive target', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(
			'/drives/b!driveA/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/usedRange',
		)
		.reply(200, { values: [['row'], ['drive-a-row']] });

	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(
			'/drives/b!driveB/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/usedRange',
		)
		.reply(200, { values: [['row'], ['drive-b-row']] });

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['readRows.sp.drive.perItem.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
