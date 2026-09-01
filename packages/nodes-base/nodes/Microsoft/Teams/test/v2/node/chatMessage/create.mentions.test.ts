import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const ADA = '33333333-3333-3333-3333-333333333333';

// The pinData in the fixture is Graph's normalised echo (`<br>\n<br>\n`, `&amp;`). The request
// below is what the node actually sends, so the matcher pins `<br><br>` and a raw `&`. The href
// itself is machine-derived under the harness and stays wildcarded.
describe('Test MicrosoftTeamsV2, chatMessage => create with mentions', () => {
	nock('https://graph.microsoft.com')
		.get(`/v1.0/users/${ADA}`)
		.query({ $select: 'id,displayName,userPrincipalName' })
		.reply(200, { id: ADA, displayName: 'Ada Byron', userPrincipalName: 'ada@example.com' });

	nock('https://graph.microsoft.com')
		.post('/v1.0/chats/19:ebed9ad42c904d6c83adf0db360053ec@thread.v2/messages', (body) => {
			const { content } = (body as { body: { content: string } }).body;
			const [mention] = (body as { mentions?: Array<Record<string, unknown>> }).mentions ?? [];
			return (
				content.startsWith('Hello! <at id="0">Ada Byron</at><br><br><em> Powered by <a href="') &&
				content.includes(
					'utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.microsoftTeams',
				) &&
				content.endsWith('">this n8n workflow</a> </em>') &&
				mention?.id === 0 &&
				mention?.mentionText === 'Ada Byron' &&
				(mention?.mentioned as { user: { id: string } })?.user?.id === ADA
			);
		})
		.reply(200, {
			id: '1698378560692',
			messageType: 'message',
			createdDateTime: '2023-10-27T03:49:20.692Z',
			chatId: '19:ebed9ad42c904d6c83adf0db360053ec@thread.v2',
			importance: 'normal',
			locale: 'en-us',
			body: {
				contentType: 'html',
				content:
					'Hello! <at id="0">Ada Byron</at><br>\n<br>\n<em> Powered by <a href="http://localhost:5678/workflow/i3NYGF0LXV4qDFV9?utm_source=n8n-internal&amp;utm_medium=powered_by&amp;utm_campaign=n8n-nodes-base.microsoftTeams">this n8n workflow</a> </em>',
			},
			attachments: [],
			mentions: [
				{
					id: 0,
					mentionText: 'Ada Byron',
					mentioned: {
						user: {
							id: ADA,
							displayName: 'Ada Byron',
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
});
