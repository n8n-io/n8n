import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

/**
 * A user principal name given in By-ID mode must reach Graph verbatim, so this runs
 * through the harness rather than calling `execute` directly: only the harness puts
 * core's extract-value step in the loop, which is what a GUID-only `extractValue` on
 * `userRLC` would break.
 */
describe('Test MicrosoftTeamsV2, chatMember => add with a user principal name', () => {
	const scope = nock('https://graph.microsoft.com')
		.post('/v1.0/chats/19:ebed9ad42c904d6c83adf0db360053ec@thread.v2/members', {
			'@odata.type': '#microsoft.graph.aadUserConversationMember',
			'user@odata.bind': 'https://graph.microsoft.com/v1.0/users/jacob@contoso.com',
			roles: ['owner'],
		})
		.reply(201);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['add.upn.workflow.json'],
		// The interceptor is single-use and net connect is disabled, so a second
		// outgoing request would fail the run: this pins exactly one.
		customAssertions: () => expect(scope.isDone()).toBe(true),
	});
});
