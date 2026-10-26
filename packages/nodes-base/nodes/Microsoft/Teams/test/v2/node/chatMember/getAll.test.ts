import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// Membership ids are opaque base64 of `0##0##<tenantId>##<chatId>##<userId>`,
// derived here from the tenant, chat and user ids below so the fixture is self-consistent.
const member1 = {
	id: 'MCMjMCMjMjM3ODZjYTYtN2ZmMi00NjcyLTg3ZDAtNWM2NDllZTBhMzM3IyMxOTplYmVkOWFkNDJjOTA0ZDZjODNhZGYwZGIzNjAwNTNlY0B0aHJlYWQudjIjI2U3NmY0NTZmLTVjM2YtNGYxZS05ZDVlLTRkOGYwZjZhYjExMQ==',
	'@odata.type': '#microsoft.graph.aadUserConversationMember',
	roles: ['owner'],
	displayName: 'Ann Smith',
	userId: 'e76f456f-5c3f-4f1e-9d5e-4d8f0f6ab111',
	email: 'ann@contoso.com',
	tenantId: '23786ca6-7ff2-4672-87d0-5c649ee0a337',
	visibleHistoryStartDateTime: '0001-01-01T00:00:00Z',
};
const member2 = {
	id: 'MCMjMCMjMjM3ODZjYTYtN2ZmMi00NjcyLTg3ZDAtNWM2NDllZTBhMzM3IyMxOTplYmVkOWFkNDJjOTA0ZDZjODNhZGYwZGIzNjAwNTNlY0B0aHJlYWQudjIjI2FhMTFiYjIyLTVjM2YtNGYxZS05ZDVlLTRkOGYwZjZhYjIyMg==',
	'@odata.type': '#microsoft.graph.aadUserConversationMember',
	roles: ['owner'],
	displayName: 'Bob Jones',
	userId: 'aa11bb22-5c3f-4f1e-9d5e-4d8f0f6ab222',
	email: 'bob@contoso.com',
	tenantId: '23786ca6-7ff2-4672-87d0-5c649ee0a337',
	visibleHistoryStartDateTime: null,
};

describe('Test MicrosoftTeamsV2, chatMember => getAll', () => {
	// Registered WITHOUT `.query(...)`: this endpoint supports no OData parameters, so
	// the test fails if `$top` is ever added.
	// The workflow passes this chat id By ID and percent-encoded, the way the RLC hint
	// tells users to copy it out of a Teams URL. The decoded form below is what
	// `validateMicrosoftGraphId` must interpolate into the path.
	nock('https://graph.microsoft.com')
		.get('/v1.0/chats/19:ebed9ad42c904d6c83adf0db360053ec@thread.v2/members')
		.reply(200, { value: [member1, member2] });

	// Two pages for the returnAll workflow, on its own chat id so the interceptors
	// cannot be matched in the wrong order. The nextLink must stay same-origin or the
	// transport refuses it.
	nock('https://graph.microsoft.com')
		.get('/v1.0/chats/19:ff1e2d3c4b5a69788796a5b4c3d2e1f0@thread.v2/members')
		.reply(200, {
			value: [member1],
			'@odata.nextLink':
				'https://graph.microsoft.com/v1.0/chats/19:ff1e2d3c4b5a69788796a5b4c3d2e1f0@thread.v2/members?$skiptoken=page2',
		})
		.get('/v1.0/chats/19:ff1e2d3c4b5a69788796a5b4c3d2e1f0@thread.v2/members')
		.query({ $skiptoken: 'page2' })
		.reply(200, { value: [member2] });

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json', 'getAll.returnAll.workflow.json'],
	});
});
