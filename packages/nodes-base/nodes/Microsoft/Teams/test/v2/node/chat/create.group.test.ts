import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const CALLER = '00000000-1111-2222-3333-444444444444';
const GUEST = '33333333-3333-3333-3333-333333333333';
const BY_ID = '22222222-3333-4444-5555-666666666666';
const FEDERATED_BY_ID = '44444444-4444-4444-4444-444444444444';
const OTHER_TENANT = '4dc1fe35-8ac6-4f0d-904a-7ebcd364bea1';

// One fixture, five participant rows, one per branch of the row loop: a By Email guest whose
// mail is not their principal name, two federated rows that are bound without a lookup (one
// given as an address, one as a user object ID), a By ID row, and a row that is the caller.
describe('Test MicrosoftTeamsV2, chat => create a group chat', () => {
	const bodies: unknown[] = [];

	nock('https://graph.microsoft.com')
		.get('/v1.0/me')
		.query({ $select: 'id,userPrincipalName,userType' })
		.reply(200, { id: CALLER, userPrincipalName: 'me@contoso.com', userType: 'Member' });

	// The guest's mail differs from their principal name, so `/users/{id}` 404s and the mail
	// filter is what finds them. The bind must carry the resolved id, not the address.
	nock('https://graph.microsoft.com')
		.get('/v1.0/users/guest%40other.com')
		.query({ $select: 'id,displayName,userPrincipalName' })
		.reply(404, { error: { code: 'Request_ResourceNotFound', message: 'Resource not found' } });

	nock('https://graph.microsoft.com')
		.get('/v1.0/users')
		.query({
			$filter: "mail eq 'guest@other.com'",
			$select: 'id,displayName,userPrincipalName',
			$top: 2,
		})
		.reply(200, {
			value: [
				{
					id: GUEST,
					displayName: 'Grace Guest',
					userPrincipalName: 'guest_other.com#EXT#@contoso.onmicrosoft.com',
				},
			],
		});

	// No interceptor for either federated row on purpose: a regression that looks one up issues
	// an unmatched request, which `nock.disableNetConnect()` fails.

	nock('https://graph.microsoft.com')
		.get(`/v1.0/users/${BY_ID}`)
		.query({ $select: 'id,displayName,userPrincipalName' })
		.reply(200, { id: BY_ID, displayName: 'Bob Jones', userPrincipalName: 'bob@contoso.com' });

	nock('https://graph.microsoft.com')
		.get('/v1.0/users/me%40contoso.com')
		.query({ $select: 'id,displayName,userPrincipalName' })
		.reply(200, { id: CALLER, displayName: 'Me', userPrincipalName: 'me@contoso.com' });

	nock('https://graph.microsoft.com')
		.post('/v1.0/chats', (body) => {
			bodies.push(body);
			return true;
		})
		.reply(201, {
			id: '19:1a2b3c4d5e6f70819202a3b4c5d6e7f8@thread.v2',
			topic: 'Release planning',
			createdDateTime: '2026-09-08T09:20:11.552Z',
			lastUpdatedDateTime: '2026-09-08T09:20:11.552Z',
			chatType: 'group',
			tenantId: '23786ca6-7ff2-4672-87d0-5c649ee0a337',
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create.group.workflow.json'],
		customAssertions: () => {
			expect(nock.pendingMocks()).toEqual([]);
			expect(bodies).toEqual([
				{
					chatType: 'group',
					topic: 'Release planning',
					members: [
						{
							'@odata.type': '#microsoft.graph.aadUserConversationMember',
							roles: ['owner'],
							'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${CALLER}')`,
						},
						{
							'@odata.type': '#microsoft.graph.aadUserConversationMember',
							roles: ['guest'],
							'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${GUEST}')`,
						},
						{
							'@odata.type': '#microsoft.graph.aadUserConversationMember',
							roles: ['owner'],
							// Both escape layers: the `#` and `@` are percent-encoded for the URL and the
							// single quote is doubled for the OData literal.
							'user@odata.bind':
								"https://graph.microsoft.com/v1.0/users('o''brien%23EXT%23%40fabrikam.com')",
							tenantId: OTHER_TENANT,
						},
						{
							'@odata.type': '#microsoft.graph.aadUserConversationMember',
							// The fixture omits `role` and the editor default fills it in here. The
							// runtime fallback, for a row that reaches the node without one, is covered
							// in `create.validation.test.ts`.
							roles: ['owner'],
							'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${BY_ID}')`,
						},
						{
							'@odata.type': '#microsoft.graph.aadUserConversationMember',
							roles: ['owner'],
							// The shape Graph's own federated example binds, and the one the Tenant ID
							// hint asks for: a user object ID plus the member-level tenant.
							'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${FEDERATED_BY_ID}')`,
							tenantId: OTHER_TENANT,
						},
					],
				},
			]);
		},
	});
});
