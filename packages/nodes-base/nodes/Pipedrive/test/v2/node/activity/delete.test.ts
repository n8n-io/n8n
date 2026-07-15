import { NodeTestHarness } from '@n8n/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, activity => delete', () => {
	mockFieldsApi('activity');

	nock('https://api.pipedrive.com/api/v2')
		.delete('/activities/10')
		.reply(200, {
			success: true,
			data: {
				id: 10,
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['delete.workflow.json'],
	});
});
