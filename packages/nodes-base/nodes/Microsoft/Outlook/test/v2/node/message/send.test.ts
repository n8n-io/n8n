import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, message => send', () => {
	nock('https://graph.microsoft.com')
		.post('/v1.0/me/sendMail', {
			message: {
				body: { content: 'message description', contentType: 'Text' },
				replyTo: [{ emailAddress: { address: 'reply@mail.com' } }],
				subject: 'Hello',
				toRecipients: [{ emailAddress: { address: 'to@mail.com' } }],
			},
			saveToSentItems: true,
		})
		.reply(200, {});

	new NodeTestHarness().setupTests({
		workflowFiles: ['send.workflow.json'],
	});
});
