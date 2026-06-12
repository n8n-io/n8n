import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftExcelV2, workbook => getAll', () => {
	// This workflow pins typeVersion 2, whose default Source is "OneDrive (Personal)",
	// so it keeps using the original personal-OneDrive endpoint. New nodes (>= 2.3)
	// default to "Everything" and query Microsoft Search instead (see getAll.everything.test.ts).
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
