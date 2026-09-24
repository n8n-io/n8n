import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// Runs the real transport: Graph's access-policy 403 must reach the item as the
// actionable message, not the sanitised generic one.
describe('Test MicrosoftTeamsV2, onlineMeeting => create (Service Principal, no access policy)', () => {
	nock('https://graph.microsoft.com')
		.matchHeader('Prefer', 'include-unknown-enum-members')
		.post('/v1.0/users/11111111-2222-3333-4444-555555555555/onlineMeetings')
		.reply(403, {
			error: { code: 'Forbidden', message: 'No application access policy found for this app' },
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create.servicePrincipal.forbidden.workflow.json'],
	});
});
