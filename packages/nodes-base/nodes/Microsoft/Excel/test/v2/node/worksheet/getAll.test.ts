import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftExcelV2, worksheet => getAll', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.get(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets?%24select=name&%24top=3',
		)
		.reply(200, {
			value: [
				{
					id: '{00000000-0001-0000-0000-000000000000}',
					name: 'Sheet1',
				},
				{
					id: '{F7AF92FE-D42D-452F-8E4A-901B1D1EBF3F}',
					name: 'Sheet2',
				},
				{
					id: '{BF7BD843-4912-4B81-A0AC-4FBBC2783E20}',
					name: 'foo2',
				},
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json'],
	});
});
