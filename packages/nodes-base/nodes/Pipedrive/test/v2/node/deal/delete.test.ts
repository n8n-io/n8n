import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, deal => delete', () => {
	mockFieldsApi('deal');

	nock('https://api.pipedrive.com/api/v2')
		.delete('/deals/8')
		.reply(200, {
			success: true,
			data: {
				id: 8,
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['delete.workflow.json'],
	});
});
