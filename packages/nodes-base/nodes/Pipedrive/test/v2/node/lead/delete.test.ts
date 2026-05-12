import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV2, lead => delete', () => {
	nock('https://api.pipedrive.com/v1')
		.delete('/leads/9ce77a10-2e16-11f1-91c1-d76c55e1594b')
		.reply(200, {
			success: true,
			data: {
				id: '9ce77a10-2e16-11f1-91c1-d76c55e1594b',
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['delete.workflow.json'],
	});
});
