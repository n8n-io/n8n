import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const CALLER = '00000000-1111-2222-3333-444444444444';
const JANE = '714c1202-cbac-40ff-9160-53ab5c4df9b8';

describe('Test MicrosoftTeamsV2, chat => create a one-on-one chat', () => {
	const bodies: unknown[] = [];

	nock('https://graph.microsoft.com')
		.get('/v1.0/me')
		.query({ $select: 'id,userPrincipalName,userType' })
		.reply(200, { id: CALLER, userPrincipalName: 'me@contoso.com', userType: 'Member' });

	nock('https://graph.microsoft.com')
		.get('/v1.0/users/jane%40contoso.com')
		.query({ $select: 'id,displayName,userPrincipalName' })
		.reply(200, { id: JANE, displayName: 'Jane Smith', userPrincipalName: 'jane@contoso.com' });

	nock('https://graph.microsoft.com')
		.post('/v1.0/chats', (body) => {
			bodies.push(body);
			return true;
		})
		.reply(201, {
			id: '19:0a1b2c3d4e5f60718293a4b5c6d7e8f9@thread.v2',
			topic: null,
			createdDateTime: '2026-09-08T09:12:44.107Z',
			lastUpdatedDateTime: '2026-09-08T09:12:44.107Z',
			chatType: 'oneOnOne',
			tenantId: '23786ca6-7ff2-4672-87d0-5c649ee0a337',
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create.oneOnOne.workflow.json'],
		// The whole body, not a predicate: an `endsWith` check cannot fail for a relative bind,
		// and only a deep-equal can express "no `tenantId` key" and "no `topic` key".
		customAssertions: () => {
			expect(nock.pendingMocks()).toEqual([]);
			expect(bodies).toEqual([
				{
					chatType: 'oneOnOne',
					members: [
						{
							'@odata.type': '#microsoft.graph.aadUserConversationMember',
							roles: ['owner'],
							'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${CALLER}')`,
						},
						{
							'@odata.type': '#microsoft.graph.aadUserConversationMember',
							roles: ['owner'],
							'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${JANE}')`,
						},
					],
				},
			]);
		},
	});
});
