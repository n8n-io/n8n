import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// The cached RLC name in the fixture is deliberately stale ("Jane (stale)"): the mention text
// below can only be right if the node really resolved the id through Graph. `pendingMocks`
// makes a skipped resolve fail rather than pass quietly.
describe('Test MicrosoftTeamsV2, channelMessage => reply with mentions', () => {
	nock('https://graph.microsoft.com')
		.get('/v1.0/users/11111111-1111-1111-1111-111111111111')
		.query({ $select: 'id,displayName,userPrincipalName' })
		.reply(200, {
			id: '11111111-1111-1111-1111-111111111111',
			displayName: 'Jane Smith',
			userPrincipalName: 'jane@example.com',
		});

	// `contentType` coerced from the fixture's `text`, and the token after the text because the
	// fixture sets Mention Placement to `end`.
	nock('https://graph.microsoft.com')
		.post('/beta/teams/1111-2222-3333/channels/42:aaabbbccc.tacv2/messages/1698324478896/replies', {
			body: {
				contentType: 'html',
				content: 'on it <at id="0">Jane Smith</at>',
			},
			mentions: [
				{
					id: 0,
					mentionText: 'Jane Smith',
					mentioned: {
						user: {
							id: '11111111-1111-1111-1111-111111111111',
							displayName: 'Jane Smith',
							userIdentityType: 'aadUser',
						},
					},
				},
			],
		})
		.reply(200, {
			id: '1698324500123',
			replyToId: '1698324478896',
			messageType: 'message',
			createdDateTime: '2023-10-26T12:48:20.123Z',
			importance: 'normal',
			locale: 'en-us',
			body: {
				contentType: 'html',
				content: 'on it <at id="0">Jane Smith</at>',
			},
			channelIdentity: {
				teamId: '1111-2222-3333',
				channelId: '42:aaabbbccc.tacv2',
			},
			attachments: [],
			mentions: [
				{
					id: 0,
					mentionText: 'Jane Smith',
					mentioned: {
						user: {
							id: '11111111-1111-1111-1111-111111111111',
							displayName: 'Jane Smith',
							userIdentityType: 'aadUser',
							tenantId: '23786ca6-7ff2-4672-87d0-5c649ee0a337',
						},
					},
				},
			],
			reactions: [],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['reply.mentions.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
