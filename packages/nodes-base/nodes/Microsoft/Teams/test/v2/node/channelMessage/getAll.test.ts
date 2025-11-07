import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, channelMessage => getAll', () => {
	nock('https://graph.microsoft.com')
		.get('/beta/teams/1111-2222-3333/channels/42:aaabbbccc.tacv2/messages')
		.reply(200, {
			value: [
				{
					id: '1698130964682',
					replyToId: null,
					etag: '1698130964682',
					messageType: 'message',
					createdDateTime: '2023-10-24T07:02:44.682Z',
					lastModifiedDateTime: '2023-10-24T07:02:44.682Z',
					lastEditedDateTime: null,
					deletedDateTime: null,
					subject: '',
					summary: null,
					chatId: null,
					importance: 'normal',
					locale: 'en-us',
					webUrl:
						'https://teams.microsoft.com/l/message/threadId/1698130964682?groupId=1111-2222-3333&tenantId=tenantId-111-222-333&createdTime=1698130964682&parentMessageId=1698130964682',
					onBehalfOf: null,
					policyViolation: null,
					eventDetail: null,
					from: {
						application: null,
						device: null,
						user: {
							'@odata.type': '#microsoft.graph.teamworkUserIdentity',
							id: '11111-2222-3333',
							displayName: 'My Name',
							userIdentityType: 'aadUser',
							tenantId: 'tenantId-111-222-333',
						},
					},
					body: {
						contentType: 'html',
						content:
							'<div>I added a tab at the top of this channel. Check it out!</div><attachment id="tab::f22a0494-6f7c-4512-85c5-e4ce72ce142a"></attachment>',
					},
					channelIdentity: {
						teamId: '1111-2222-3333',
						channelId: '42:aaabbbccc.tacv2',
					},
					attachments: [
						{
							id: 'tab::f22a0494-6f7c-4512-85c5-e4ce72ce142a',
							contentType: 'tabReference',
							contentUrl: null,
							content: null,
							name: 'Tasks',
							thumbnailUrl: null,
							teamsAppId: null,
						},
					],
					mentions: [],
					reactions: [],
				},
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json'],
	});
});
