import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

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

	const workflows = ['nodes/Microsoft/Outlook/test/v2/node/message/send.workflow.json'];
	testWorkflows(workflows);
});
