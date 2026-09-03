import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const member1 = {
	id: 'MCMjMCMjZmJlMmJmNDctMTZjOC00N2NmLWI0YTUtNGI5YTE5YzBmZTI4IyMxOTpiOTVhNTc3NGMxYzc0MjJmYjNkMTljMTU2Y2E5N2I5NEB0aHJlYWQudjIjIzg2MTA0MDBhLTUyYzYtNGI2Yy04MTZjLThjNjIzZDNlZmQ5Yg==',
	roles: ['owner'],
	displayName: 'Ann Smith',
	userId: 'e76f456f-5c3f-4f1e-9d5e-4d8f0f6ab111',
	email: 'ann@contoso.com',
	tenantId: '23786ca6-7ff2-4672-87d0-5c649ee0a337',
	visibleHistoryStartDateTime: '0001-01-01T00:00:00Z',
};
const member2 = {
	id: 'MCMjMSMj',
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
