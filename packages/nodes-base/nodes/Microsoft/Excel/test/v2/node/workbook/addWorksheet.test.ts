import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

import { credentials } from '../../../credentials';

describe('Test MicrosoftExcelV2, workbook => addWorksheet', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post('/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/createSession', {
			persistChanges: true,
		})
		.reply(200, { id: 12345 })
		.post('/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/worksheets/add', {
			name: 'Sheet42',
		})
		.matchHeader('workbook-session-id', '12345')
		.reply(200, {
			id: '{266ADAB7-25B6-4F28-A2D1-FD5BFBD7A4F0}',
			name: 'Sheet42',
			position: 8,
			visibility: 'Visible',
		})
		.post('/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook/closeSession')
		.reply(200);

	const workflows = ['nodes/Microsoft/Excel/test/v2/node/workbook/addWorksheet.workflow.json'];
	testWorkflows(workflows, credentials);
});
