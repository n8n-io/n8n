import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from './credentials';

// The userTarget RLC accepts expressions, so it must be resolved per input item: the
// Test Data node fans out to two users and each item's request must be rebased onto that
// item's `/users/{id}` root (encoding pin preserved). Both interceptors are consume-once and
// `pendingMocks` must be empty afterwards, so a run that sends both items to item 0's
// user fails in either direction (unmatched second request AND an unconsumed mock).
describe('Test MicrosoftToDo, Service Principal list:getAll per-item target', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get('/users/jane%40contoso.com/todo/lists')
		.query({ $top: 50 })
		.reply(200, { value: [{ id: 'list-jane', displayName: 'Jane Tasks' }] });

	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get('/users/john%40contoso.com/todo/lists')
		.query({ $top: 50 })
		.reply(200, { value: [{ id: 'list-john', displayName: 'John Tasks' }] });

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['list.getAll.sp.perItem.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
