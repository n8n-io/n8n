import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, channelMessage => reply', () => {
	nock('https://graph.microsoft.com')
		.post('/beta/teams/1111-2222-3333/channels/42:aaabbbccc.tacv2/messages/1698324478896/replies', {
			body: { content: 'on it', contentType: 'html' },
		})
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/beta/$metadata#teams('1111-2222-3333')/channels('threadId')/messages/$entity",
			id: '1698324500123',
			replyToId: '1698324478896',
			etag: '1698324500123',
			messageType: 'message',
			createdDateTime: '2023-10-26T12:48:20.123Z',
			lastModifiedDateTime: '2023-10-26T12:48:20.123Z',
			subject: null,
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
				content: 'on it',
			},
			channelIdentity: {
				teamId: '1111-2222-3333',
				channelId: '42:aaabbbccc.tacv2',
			},
			attachments: [],
			mentions: [],
			reactions: [],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['reply.workflow.json'],
	});
});
