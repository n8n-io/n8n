import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from './credentials';

// Smoke test for the app-only Service Principal path through NodeTestHarness. The harness
// preAuthentication is a no-op, so the token POST never fires — we nock ONLY the scoped
// Graph endpoint and require the Bearer header the credential's `authenticate` attaches.
// The request is rebased from `/me/todo/lists` onto `/users/{upn}/todo/lists`, proving the
// app-only routing end to end. login.microsoftonline.com is deliberately NOT nocked.
describe('Test MicrosoftToDo, Service Principal list:getAll smoke', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get('/users/jane%40contoso.com/todo/lists')
		.query(true)
		.reply(200, {
			value: [
				{ id: 'AAMkAExampleListId=', displayName: 'Tasks', wellknownListName: 'defaultList' },
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['list.getAll.sp.workflow.json'],
	});
});
