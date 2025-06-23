import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftExcelV2, table => getColumns', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.get(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7B00000000-0001-0000-0000-000000000000%7D/tables/%7B613E8967-D581-44ED-81D3-82A01AA6A05C%7D/columns?%24top=100&%24skip=0',
		)
		.reply(200, {
			value: [
				{ name: 'country' },
				{ name: 'browser' },
				{ name: 'session_duration' },
				{ name: 'visits' },
			],
		})
		.get(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7B00000000-0001-0000-0000-000000000000%7D/tables/%7B613E8967-D581-44ED-81D3-82A01AA6A05C%7D/columns?%24top=100&%24skip=100',
		)
		.reply(200, { value: [] });

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getColumns.workflow.json'],
	});
});
