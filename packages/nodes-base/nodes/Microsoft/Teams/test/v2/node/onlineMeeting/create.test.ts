import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, onlineMeeting => create', () => {
	nock('https://graph.microsoft.com')
		// Exact body: proves option mapping, including booleans explicitly set to false.
		.post('/v1.0/me/onlineMeetings', {
			subject: 'Quarterly Sync',
			startDateTime: '2026-09-10T10:00:00Z',
			endDateTime: '2026-09-10T10:30:00Z',
			allowAttendeeToEnableCamera: false,
			allowAttendeeToEnableMic: true,
			allowMeetingChat: 'limited',
			allowTeamworkReactions: false,
			allowedPresenters: 'organizer',
			isEntryExitAnnounced: true,
			lobbyBypassSettings: { scope: 'organizationAndFederated' },
			recordAutomatically: false,
			joinMeetingIdSettings: { isPasscodeRequired: true },
		})
		.reply(201, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#users('11111111-2222-3333-4444-555555555555')/onlineMeetings/$entity",
			id: 'MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi',
			creationDateTime: '2026-09-01T09:00:00.649Z',
			startDateTime: '2026-09-10T10:00:00Z',
			endDateTime: '2026-09-10T10:30:00Z',
			joinWebUrl:
				'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0?context=%7b%22Tid%22%3a%22abc%22%7d',
			subject: 'Quarterly Sync',
			participants: {
				organizer: {
					upn: 'alex@contoso.com',
					identity: {
						user: { id: '11111111-2222-3333-4444-555555555555', displayName: 'Alex Wilber' },
					},
				},
			},
			joinMeetingIdSettings: {
				isPasscodeRequired: true,
				joinMeetingId: '1234567890',
				passcode: 'xK7mp2',
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create.workflow.json'],
	});
});
