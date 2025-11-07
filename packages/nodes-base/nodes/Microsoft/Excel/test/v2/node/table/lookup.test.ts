import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftExcelV2, table => lookup', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.get(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7B00000000-0001-0000-0000-000000000000%7D/tables/%7B613E8967-D581-44ED-81D3-82A01AA6A05C%7D/rows?%24top=100&%24skip=0',
		)
		.reply(200, {
			value: [
				{ index: 0, values: [['uk', 'firefox', 1, 1]] },
				{ index: 1, values: [['us', 'chrome', 1, 12]] },
				{ index: 2, values: [['test', 'test', 55, 123]] },
				{ index: 3, values: [['ua', 'chrome', 1, 3]] },
				{ index: 4, values: [['ua', 'firefox', 1, 4]] },
				{ index: 5, values: [['uk', 'chrome', 1, 55]] },
			],
		})
		.get(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7B00000000-0001-0000-0000-000000000000%7D/tables/%7B613E8967-D581-44ED-81D3-82A01AA6A05C%7D/rows?%24top=100&%24skip=100',
		)
		.reply(200, { value: [] })
		.get(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7B00000000-0001-0000-0000-000000000000%7D/tables/%7B613E8967-D581-44ED-81D3-82A01AA6A05C%7D/columns?%24select=name&%24top=100&%24skip=0',
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
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7B00000000-0001-0000-0000-000000000000%7D/tables/%7B613E8967-D581-44ED-81D3-82A01AA6A05C%7D/columns?%24select=name&%24top=100&%24skip=100',
		)
		.reply(200, { value: [] });

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['lookup.workflow.json'],
	});
});
