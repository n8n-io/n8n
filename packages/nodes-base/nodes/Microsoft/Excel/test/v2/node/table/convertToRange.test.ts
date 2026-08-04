import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftExcelV2, table => convertToRange', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/tables/%7B6321EE4A-AC21-48AD-87D9-B527637D94B3%7D/convertToRange',
		)
		.reply(200, {
			address: 'Sheet4!A1:D5',
			values: [
				['id', 'name', 'age', 'data'],
				[1, 'Sam', 33, 'data 1'],
				[2, 'Jon', 44, 'data 2'],
				[3, 'Sam', 34, 'data 4'],
				[3, 'Donald', 99, 'data 5'],
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['convertToRange.workflow.json'],
	});
});
