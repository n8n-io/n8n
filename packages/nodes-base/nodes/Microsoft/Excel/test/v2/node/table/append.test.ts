import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftExcelV2, table => append', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.get(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/tables/%7B317CA469-7D1C-4A5D-9B0B-424444BF0336%7D/columns',
		)
		.reply(200, {
			value: [{ name: 'id' }, { name: 'name' }, { name: 'age' }, { name: 'data' }],
		})
		.post(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/tables/%7B317CA469-7D1C-4A5D-9B0B-424444BF0336%7D/rows/add',
			{ values: [['3', 'Donald', '99', 'data 5']] },
		)
		.reply(200, {
			index: 3,
			values: [[3, 'Donald', 99, 'data 5']],
		})
		.post('/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/createSession')
		.reply(200, { id: 12345 })
		.post('/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/closeSession')
		.reply(200);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['append.workflow.json'],
	});
});
