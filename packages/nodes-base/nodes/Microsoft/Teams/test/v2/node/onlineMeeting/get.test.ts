import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const meeting = {
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
		isPasscodeRequired: false,
		joinMeetingId: '1234567890',
		passcode: null,
	},
};

describe('Test MicrosoftTeamsV2, onlineMeeting => get', () => {
	nock('https://graph.microsoft.com')
		.matchHeader('Prefer', 'include-unknown-enum-members')
		.get('/v1.0/me/onlineMeetings/MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi')
		.reply(200, meeting)
		.get('/v1.0/me/onlineMeetings')
		.query({
			$filter: `JoinWebUrl eq '${meeting.joinWebUrl}'`,
		})
		.reply(200, { value: [meeting] });

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['get.workflow.json', 'get.joinUrl.workflow.json'],
	});
});
