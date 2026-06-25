import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// End-to-end guard for the Service Principal "Access As: Drive" target. With a drive
// target the request roots at `/drives/{id}` directly (no `/drive` navigation appended,
// so no double `/drive`), proving the `/drives/{id}` branch through the real node +
// credential authenticate + nock pipeline — the user-target smoke can't cover this.
describe('Test MicrosoftExcelV2, Service Principal worksheet => readRows (drive target) smoke', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get(
			'/drives/b!abc-123_XYZ/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/usedRange',
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
		workflowFiles: ['readRows.sp.drive.workflow.json'],
	});
});
