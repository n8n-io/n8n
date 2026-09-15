import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// App-only create lands under the organizer, never under /me. The harness no-ops
// preAuthentication and takes the Bearer from the inline fixture, so nock only Graph.
describe('Test MicrosoftTeamsV2, onlineMeeting => create (Service Principal)', () => {
	nock('https://graph.microsoft.com')
		.matchHeader('Prefer', 'include-unknown-enum-members')
		.post('/v1.0/users/11111111-2222-3333-4444-555555555555/onlineMeetings', {
			subject: 'Standup',
			startDateTime: '2026-09-11T09:00:00Z',
			endDateTime: '2026-09-11T09:15:00Z',
		})
		.reply(201, {
			id: 'MSpTdGFuZHVwLWFwcC1vbmx5',
			startDateTime: '2026-09-11T09:00:00Z',
			endDateTime: '2026-09-11T09:15:00Z',
			joinWebUrl: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_YXBwb25seQ%40thread.v2/0',
			subject: 'Standup',
			participants: {
				organizer: {
					upn: 'alex@contoso.com',
					identity: {
						user: { id: '11111111-2222-3333-4444-555555555555', displayName: 'Alex Wilber' },
					},
				},
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create.servicePrincipal.workflow.json'],
	});
});
