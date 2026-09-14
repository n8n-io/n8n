import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, product => delete', () => {
	mockFieldsApi('product');

	nock('https://api.pipedrive.com/api/v2')
		.delete('/products/3')
		.reply(200, {
			success: true,
			data: {
				id: 3,
			},
			additional_data: null,
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['delete.workflow.json'],
	});
});
