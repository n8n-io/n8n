import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test MicrosoftExcelV2, worksheet => deleteWorksheet', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.delete(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7B88D9C37A-4180-4B23-8996-BF11F32EB63C%7D',
		)
		.reply(200, {
			values: [{ json: { success: true } }],
		});

	const workflows = ['nodes/Microsoft/Excel/test/v2/node/worksheet/deleteWorksheet.workflow.json'];
	testWorkflows(workflows);
});
