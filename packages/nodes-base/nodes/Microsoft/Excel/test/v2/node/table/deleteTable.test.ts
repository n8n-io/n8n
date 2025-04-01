import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test MicrosoftExcelV2, table => deleteTable', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.delete(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D/tables/%7B92FBE3F5-3180-47EE-8549-40892C38DA7F%7D',
		)
		.reply(200);

	const workflows = ['nodes/Microsoft/Excel/test/v2/node/table/deleteTable.workflow.json'];
	testWorkflows(workflows);
});
