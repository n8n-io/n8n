import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test MicrosoftExcelV2, workbook => deleteWorkbook', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.delete('/drive/items/01FUWX3BXJLISGF2CFWBGYPHXFCXPXOJUK')
		.reply(200);

	const workflows = ['nodes/Microsoft/Excel/test/v2/node/workbook/deleteWorkbook.workflow.json'];
	testWorkflows(workflows);
});
