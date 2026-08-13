import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from './credentials';

// Per-item error isolation under continueOnFail: item 0's bogus target ("not a user"
// fails the shape validators) must produce an error item for item 0 only, while item 1
// still hits its own user's root. Only jane is mocked; consume-once + empty pendingMocks
// pin the exact request set.
describe('Test MicrosoftToDo, Service Principal list:getAll fails only the bad item under continueOnFail', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get('/users/jane%40contoso.com/todo/lists')
		.query({ $top: 50 })
		.reply(200, { value: [{ id: 'list-jane', displayName: 'Jane Tasks' }] });

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['list.getAll.sp.perItemContinueOnFail.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
