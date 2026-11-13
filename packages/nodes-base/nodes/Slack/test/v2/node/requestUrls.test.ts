import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test SlackV2, request URLs', () => {
	const slackNock = nock('https://slack.com')
		.post('/api/chat.postEphemeral', {
			channel: 'C08514ZPKB8',
			text: 'ephemeral message',
			user: 'U0362BXQYJW',
			includeLinkToWorkflow: false,
		})
		.reply(200, { ok: true, message_ts: '1734322671.726339' })
		.post('/api/reactions.add', {
			channel: 'C08514ZPKB8',
			name: 'thumbsup',
			timestamp: '1734322671.726339',
		})
		.reply(200, { ok: true })
		.get('/api/users.info')
		.query({ user: 'U0362BXQYJW' })
		.reply(200, { ok: true, user: { id: 'U0362BXQYJW', name: 'jane' } })
		.get('/api/files.info')
		.query({ file: 'F07A1B2C3D4' })
		.reply(200, { ok: true, file: { id: 'F07A1B2C3D4', name: 'report.txt' } });

	afterAll(() => slackNock.done());

	new NodeTestHarness().setupTests({
		workflowFiles: ['requestUrls.workflow.json'],
	});
});
