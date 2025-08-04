import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftExcelV2, workbook => deleteWorkbook', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.delete('/drive/items/01FUWX3BXJLISGF2CFWBGYPHXFCXPXOJUK')
		.reply(200);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['deleteWorkbook.workflow.json'],
	});
});
