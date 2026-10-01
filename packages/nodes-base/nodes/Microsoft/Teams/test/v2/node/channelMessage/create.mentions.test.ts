import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { readFileSync } from 'fs';
import { jsonParse, type IDataObject, type INode } from 'n8n-workflow';
import nock from 'nock';
import { join } from 'path';

import { credentials } from '../../../credentials';

// The cached RLC names in the fixture are deliberately stale ("Jane (stale)"): the mention text
// below can only be right if the node really resolved each id through Graph. `pendingMocks`
// makes a skipped resolve fail rather than pass quietly.
describe('Test MicrosoftTeamsV2, channelMessage => create with mentions', () => {
	nock('https://graph.microsoft.com')
		.get('/v1.0/users/11111111-1111-1111-1111-111111111111')
		.query({ $select: 'id,displayName,userPrincipalName' })
		.reply(200, {
			id: '11111111-1111-1111-1111-111111111111',
			displayName: 'Jane Smith',
			userPrincipalName: 'jane@example.com',
		});

	nock('https://graph.microsoft.com')
		.get('/v1.0/users/22222222-2222-2222-2222-222222222222')
		.query({ $select: 'id,displayName,userPrincipalName' })
		.reply(200, {
			id: '22222222-2222-2222-2222-222222222222',
			displayName: 'Bob Jones',
			userPrincipalName: 'bob@example.com',
		});

	// `/beta` for channel messages, `contentType` coerced from the fixture's `text`, and every
	// `<at id="N">` paired with the integer `mentions[N].id` Graph requires.
	nock('https://graph.microsoft.com')
		.post('/beta/teams/1111-2222-3333/channels/42:aaabbbccc.tacv2/messages', {
			body: {
				contentType: 'html',
				content: '<at id="0">Jane Smith</at> <at id="1">Bob Jones</at> new sale',
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
				{
					id: 1,
					mentionText: 'Bob Jones',
					mentioned: {
						user: {
							id: '22222222-2222-2222-2222-222222222222',
							displayName: 'Bob Jones',
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
				content: '<at id="0">Jane Smith</at> <at id="1">Bob Jones</at> new sale',
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
				{
					id: 1,
					mentionText: 'Bob Jones',
					mentioned: {
						user: {
							id: '22222222-2222-2222-2222-222222222222',
							displayName: 'Bob Jones',
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
		workflowFiles: ['create.mentions.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});

	// The harness run above is what kills a wrong `mentionType` default. This guards its premise:
	// the fixture is the on-disk shape of a workflow saved before the mention type existed, and
	// adding a mention type here would silently make that run prove nothing.
	it('keeps the harness fixture free of a mention type', () => {
		const workflow = jsonParse<{ nodes: INode[] }>(
			readFileSync(join(__dirname, 'create.mentions.workflow.json'), 'utf8'),
		);
		const teams = workflow.nodes.find((node) => node.type === 'n8n-nodes-base.microsoftTeams');
		const rows = ((teams?.parameters.mentions as IDataObject)?.mention ?? []) as IDataObject[];

		expect(rows).toHaveLength(2);
		for (const row of rows) {
			expect(row).toHaveProperty('userId');
			expect(row).not.toHaveProperty('mentionType');
		}
	});
});
