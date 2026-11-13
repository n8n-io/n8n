import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftExcelV2, worksheet => clear', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BF7AF92FE-D42D-452F-8E4A-901B1D1EBF3F%7D/range/clear',
			{ applyTo: 'All' },
		)
		.reply(200, {
			values: [{ json: { success: true } }],
		})
		.post(
			"/drive/items/7d2b1f6a9c3e4b58!ABC123DEF456/workbook/worksheets/%7BF7AF92FE-D42D-452F-8E4A-901B1D1EBF3F%7D/range(address='')/clear",
			{ applyTo: 'All' },
		)
		.reply(200, {})
		.post(
			"/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/%7BF7AF92FE-D42D-452F-8E4A-901B1D1EBF3F%7D/range(address='A1:B2')/clear",
			{ applyTo: 'All' },
		)
		.reply(200, {});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['clear.workflow.json'],
	});
});
