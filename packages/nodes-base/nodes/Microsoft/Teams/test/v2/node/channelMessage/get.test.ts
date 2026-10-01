import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, channelMessage => get', () => {
	nock('https://graph.microsoft.com')
		.get('/beta/teams/1111-2222-3333/channels/42:aaabbbccc.tacv2/messages/1698324478896')
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/beta/$metadata#teams('1111-2222-3333')/channels('threadId')/messages/$entity",
			id: '1698324478896',
			replyToId: null,
			etag: '1698324478896',
			messageType: 'message',
			createdDateTime: '2023-10-26T12:47:58.896Z',
			lastModifiedDateTime: '2023-10-26T12:47:58.896Z',
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
				content: 'new sale',
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
		workflowFiles: ['get.workflow.json'],
	});
});
