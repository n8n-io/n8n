import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftExcelV2, workbook => getAll (v2.3 default Source = Everything)', () => {
	// A 2.3 node leaves Source unset, so it defaults to "Everything" and queries
	// Microsoft Search (POST /search/query) instead of the personal-OneDrive endpoint.
	nock('https://graph.microsoft.com/v1.0')
		.post('/search/query')
		.reply(200, {
			value: [
				{
					hitsContainers: [
						{
							moreResultsAvailable: false,
							hits: [
								{
									resource: {
										'@odata.type': '#microsoft.graph.driveItem',
										id: '01EVERYTHING',
										name: 'Quarterly.xlsx',
										webUrl: 'https://contoso.sharepoint.com/sites/finance/Quarterly.xlsx',
										parentReference: { driveId: 'b!financeDrive' },
									},
								},
							],
						},
					],
				},
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.everything.workflow.json'],
	});
});
