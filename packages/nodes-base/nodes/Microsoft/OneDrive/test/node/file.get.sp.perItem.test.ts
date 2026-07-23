import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

// The target RLC accepts expressions, so it must be resolved per input item, INSIDE the
// per-item try: item 0's bogus target ("not a user" fails the shape validators) must
// produce a continueOnFail error item for item 0 only (a pre-loop resolve would instead
// abort the whole run) while items 1 and 2 hit their own users' drives.
// Only the two valid users are mocked; consume-once + empty pendingMocks pin the exact
// request set in both directions.
describe('Test MicrosoftOneDrive, Service Principal file:get resolves the target per item and fails only the bad item under continueOnFail', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get('/users/alice%40contoso.com/drive/items/FILE123')
		.reply(200, { id: 'FILE123', name: 'alice.txt', file: { mimeType: 'text/plain' } });

	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get('/users/bob%40contoso.com/drive/items/FILE123')
		.reply(200, { id: 'FILE123', name: 'bob.txt', file: { mimeType: 'text/plain' } });

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['file.get.sp.perItem.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
