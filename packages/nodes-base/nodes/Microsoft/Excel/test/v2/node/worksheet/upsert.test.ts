import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftExcelV2, worksheet => upsert', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.get(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/usedRange',
		)
		.reply(200, {
			address: 'Sheet4!A1:D6',
			values: [
				['id', 'name', 'age', 'data'],
				[1, 'Sam', 33, 'data 1'],
				[2, 'Jon', 44, 'data 2'],
				[3, 'Ron', 55, 'data 3'],
			],
		})
		.patch(
			"/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/range(address='A1:D7')",
		)
		.reply(200, {
			values: [
				['id', 'name', 'age', 'data'],
				[1, 'Sam', 33, 'data 1'],
				[2, 'Jon', 44, 'data 2'],
				[3, 'Ron', 55, 'data 3'],
				[4, 'Sam', 34, 'data 4'],
			],
		})
		.get(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7B426949D7-797F-43A9-A8A4-8FE283495A82%7D/usedRange',
		)
		.reply(200, {
			address: 'Sheet4!A1:D6',
			values: [
				['id', 'name', 'age', 'data'],
				[1, 'Sam', 33, 'data 1'],
				[2, 'Jon', 44, 'data 2'],
				[3, 'Ron', 55, 'data 3'],
			],
		})
		.patch(
			"/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7B426949D7-797F-43A9-A8A4-8FE283495A82%7D/range(address='A1:D7')",
		)
		.reply(200, {
			values: [
				['id', 'name', 'age', 'data'],
				[1, 'Sam', 33, 'data 1'],
				[2, 'Jon', 44, 'data 2'],
				[3, 'Ron', 55, 'data 3'],
				[4, 'Don', 37, 'data 44'],
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['upsert.workflow.json'],
	});
});
