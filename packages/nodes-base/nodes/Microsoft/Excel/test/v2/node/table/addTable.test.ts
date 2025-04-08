import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test MicrosoftExcelV2, table => addTable', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/tables/add',
			{ address: 'A1:D4', hasHeaders: true },
		)
		.reply(200, {
			style: 'TableStyleMedium2',
			name: 'Table3',
			showFilterButton: true,
			id: '{317CA469-7D1C-4A5D-9B0B-424444BF0336}',
			highlightLastColumn: false,
			highlightFirstColumn: false,
			legacyId: '3',
			showBandedColumns: false,
			showBandedRows: true,
			showHeaders: true,
			showTotals: false,
		});

	const workflows = ['nodes/Microsoft/Excel/test/v2/node/table/addTable.workflow.json'];
	testWorkflows(workflows);
});
