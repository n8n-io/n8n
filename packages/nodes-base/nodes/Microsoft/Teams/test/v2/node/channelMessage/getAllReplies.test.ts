import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, channelMessage => getAllReplies', () => {
	nock('https://graph.microsoft.com')
		.get('/beta/teams/1111-2222-3333/channels/42:aaabbbccc.tacv2/messages/1698324478896/replies')
		.reply(200, {
			value: [
				{
					id: '1698324500123',
					replyToId: '1698324478896',
					etag: '1698324500123',
					messageType: 'message',
					createdDateTime: '2026-10-26T12:48:20.123Z',
					importance: 'normal',
					locale: 'en-us',
					from: {
						application: null,
						device: null,
						user: {
							'@odata.type': '#microsoft.graph.teamworkUserIdentity',
							id: '11111-2222-3333',
							displayName: 'My Name',
							userIdentityType: 'aadUser',
						},
					},
					body: {
						contentType: 'html',
						content: '<div>on it</div>',
					},
					channelIdentity: {
						teamId: '1111-2222-3333',
						channelId: '42:aaabbbccc.tacv2',
					},
					attachments: [],
					mentions: [],
					reactions: [],
				},
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAllReplies.workflow.json'],
	});
});
