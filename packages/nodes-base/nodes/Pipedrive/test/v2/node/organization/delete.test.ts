import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, organization => delete', () => {
	mockFieldsApi('organization');

	nock('https://api.pipedrive.com/api/v2')
		.delete('/organizations/7')
		.reply(200, {
			success: true,
			data: {
				id: 7,
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['delete.workflow.json'],
	});
});
