import { NodeTestHarness } from '@n8n/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV2, file => delete', () => {
	nock('https://api.pipedrive.com/v1')
		.delete('/files/2')
		.reply(200, {
			success: true,
			data: {
				id: 2,
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['delete.workflow.json'],
	});
});
