import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// Every cached RLC name in the fixture is deliberately stale ("Engineering (stale)"): the mention
// text below can only be right if the node really resolved both rows through Graph.
describe('Test MicrosoftTeamsV2, channelMessage => create with tag mentions', () => {
	// `/v1.0` for the tag, and the base64 padding interpolated raw rather than as `%3D`.
	nock('https://graph.microsoft.com')
		.get('/v1.0/teams/1111-2222-3333/tags/RW5naW5lZXJpbmc=')
		.reply(200, {
			id: 'RW5naW5lZXJpbmc=',
			teamId: '1111-2222-3333',
			displayName: 'Engineering',
			memberCount: 4,
		});

	nock('https://graph.microsoft.com')
		.get('/v1.0/users/11111111-1111-1111-1111-111111111111')
		.query({ $select: 'id,displayName,userPrincipalName' })
		.reply(200, {
			id: '11111111-1111-1111-1111-111111111111',
			displayName: 'Jane Smith',
			userPrincipalName: 'jane@example.com',
		});

	// A tag row and a user row keep their own slots, and each `<at id="N">` pairs with the
	// integer id of the entry in the same position.
	nock('https://graph.microsoft.com')
		.post('/beta/teams/1111-2222-3333/channels/42:aaabbbccc.tacv2/messages', {
			body: {
				contentType: 'html',
				content: 'new sale <at id="0">Engineering</at> <at id="1">Jane Smith</at>',
			},
			mentions: [
				{
					id: 0,
					mentionText: 'Engineering',
					mentioned: {
						tag: {
							id: 'RW5naW5lZXJpbmc=',
							displayName: 'Engineering',
						},
					},
				},
				{
					id: 1,
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
			id: '1698324478896',
			messageType: 'message',
			createdDateTime: '2023-10-26T12:47:58.896Z',
			importance: 'normal',
			locale: 'en-us',
			body: {
				contentType: 'html',
				content: 'new sale <at id="0">Engineering</at> <at id="1">Jane Smith</at>',
			},
			channelIdentity: {
				teamId: '1111-2222-3333',
				channelId: '42:aaabbbccc.tacv2',
			},
			attachments: [],
			mentions: [
				{
					id: 0,
					mentionText: 'Engineering',
					mentioned: {
						tag: {
							id: 'RW5naW5lZXJpbmc=',
							displayName: 'Engineering',
						},
					},
				},
				{
					id: 1,
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
		workflowFiles: ['create.tagMentions.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
