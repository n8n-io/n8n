import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test SlackV2, file => upload', () => {
	nock('https://slack.com')
		.get('/api/files.getUploadURLExternal?filename=test%20_name.txt&length=25')
		.reply(200, { ok: true, upload_url: 'https://slack.com/api/files.upload' })
		.post('/api/files.upload', () => true)
		.reply(200, { ok: true, file: { id: 'file_id' } })
		.post('/api/files.completeUploadExternal')
		.reply(200, { ok: true, files: [{ id: 'file_id' }] });

	new NodeTestHarness().setupTests({
		workflowFiles: ['upload.workflow.json'],
	});
});
