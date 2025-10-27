import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftExcelV2, workbook => getAll', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.get("/drive/root/search(q='.xlsx')?%24select=name&%24top=2")
		.reply(200, {
			value: [
				{
					'@odata.type': '#microsoft.graph.driveItem',
					name: 'ПРРО копія.xlsx',
				},
				{
					'@odata.type': '#microsoft.graph.driveItem',
					name: 'Book 3.xlsx',
				},
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json'],
	});
});
