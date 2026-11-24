import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV2, note => delete', () => {
	nock('https://api.pipedrive.com/v1').delete('/notes/8').reply(200, {
		success: true,
		data: true,
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['delete.workflow.json'],
	});
});
