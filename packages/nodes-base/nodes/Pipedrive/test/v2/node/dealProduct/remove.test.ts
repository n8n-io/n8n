import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV2, dealProduct => remove', () => {
	nock('https://api.pipedrive.com/api/v2')
		.delete('/deals/8/products/2')
		.reply(200, {
			success: true,
			data: {
				id: 2,
			},
			additional_data: null,
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['remove.workflow.json'],
	});
});
