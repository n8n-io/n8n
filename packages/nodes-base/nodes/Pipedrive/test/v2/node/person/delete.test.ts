import { NodeTestHarness } from '@n8n/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, person => delete', () => {
	mockFieldsApi('person');

	nock('https://api.pipedrive.com/api/v2')
		.delete('/persons/10')
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
