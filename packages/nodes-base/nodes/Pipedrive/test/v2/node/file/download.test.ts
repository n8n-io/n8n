import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV2, file => download', () => {
	nock('https://api.pipedrive.com/v1')
		.get('/files/2/download')
		.reply(200, Buffer.from('test file content'), {
			'content-type': 'application/octet-stream',
			'content-disposition': 'attachment; filename="pipedrive-test-file.txt"',
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['download.workflow.json'],
		assertBinaryData: true,
	});
});
