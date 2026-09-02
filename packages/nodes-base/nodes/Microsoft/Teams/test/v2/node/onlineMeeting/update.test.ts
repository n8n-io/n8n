import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, onlineMeeting => update', () => {
	nock('https://graph.microsoft.com')
		.matchHeader('Prefer', 'include-unknown-enum-members')
		.patch('/v1.0/me/onlineMeetings/MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi', {
			subject: 'Quarterly Sync (moved)',
			startDateTime: '2026-09-12T10:00:00Z',
			endDateTime: '2026-09-12T10:45:00Z',
			allowMeetingChat: 'disabled',
			allowTeamworkReactions: false,
			lobbyBypassSettings: { scope: 'organizer' },
		})
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#users('11111111-2222-3333-4444-555555555555')/onlineMeetings/$entity",
			id: 'MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi',
			creationDateTime: '2026-09-01T09:00:00.649Z',
			startDateTime: '2026-09-12T10:00:00Z',
			endDateTime: '2026-09-12T10:45:00Z',
			joinWebUrl:
				'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0?context=%7b%22Tid%22%3a%22abc%22%7d',
			subject: 'Quarterly Sync (moved)',
			allowMeetingChat: 'disabled',
			allowTeamworkReactions: false,
			lobbyBypassSettings: { scope: 'organizer', isDialInBypassEnabled: false },
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['update.workflow.json'],
	});
});
