import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test MicrosoftExcelV2, worksheet => readRows', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.get(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/usedRange',
		)
		.reply(200, {
			values: [
				['id', 'name', 'age', 'data'],
				[1, 'Sam', 33, 'data 1'],
				[2, 'Jon', 44, 'data 2'],
				[3, 'Ron', 55, 'data 3'],
			],
		})
		.get(
			"/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/range(address='A1:D3')",
		)
		.reply(200, {
			values: [
				['id', 'name', 'age', 'data'],
				[1, 'Sam', 33, 'data 1'],
				[2, 'Jon', 44, 'data 2'],
			],
		});

	const workflows = ['nodes/Microsoft/Excel/test/v2/node/worksheet/readRows.workflow.json'];
	testWorkflows(workflows);
});
