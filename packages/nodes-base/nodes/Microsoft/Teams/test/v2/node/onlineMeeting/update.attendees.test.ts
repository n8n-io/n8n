import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const JANE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const meetingId = 'MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi';

// The cached RLC names in the fixture are stale ("Jane (stale)"), so the principal names in the
// body can only come from the lookups. `pendingMocks` makes a skipped lookup fail loudly.
describe('Test MicrosoftTeamsV2, onlineMeeting => update with attendees', () => {
	nock('https://graph.microsoft.com')
		.get(`/v1.0/users/${JANE}`)
		.query({ $select: 'id,displayName,userPrincipalName' })
		.reply(200, { id: JANE, displayName: 'Jane Smith', userPrincipalName: 'jane@example.com' })
		.get(`/v1.0/users/${BOB}`)
		.query({ $select: 'id,displayName,userPrincipalName' })
		.reply(200, { id: BOB, displayName: 'Bob Jones', userPrincipalName: 'bob@example.com' });

	nock('https://graph.microsoft.com')
		.matchHeader('Prefer', 'include-unknown-enum-members')
		.patch(`/v1.0/me/onlineMeetings/${meetingId}`, {
			allowedPresenters: 'roleIsPresenter',
			participants: {
				attendees: [
					{ identity: { user: { id: JANE } }, upn: 'jane@example.com', role: 'presenter' },
					{ identity: { user: { id: BOB } }, upn: 'bob@example.com', role: 'attendee' },
				],
			},
		})
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#users('11111111-2222-3333-4444-555555555555')/onlineMeetings/$entity",
			id: meetingId,
			creationDateTime: '2026-09-01T09:00:00.649Z',
			startDateTime: '2026-09-12T10:00:00Z',
			endDateTime: '2026-09-12T10:45:00Z',
			joinWebUrl:
				'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0?context=%7b%22Tid%22%3a%22abc%22%7d',
			subject: 'Quarterly Sync',
			allowedPresenters: 'roleIsPresenter',
			participants: {
				organizer: {
					upn: 'alex@contoso.com',
					role: 'presenter',
					identity: {
						user: { id: '11111111-2222-3333-4444-555555555555', displayName: 'Alex Wilber' },
					},
				},
				attendees: [
					{
						upn: 'jane@example.com',
						role: 'presenter',
						identity: { user: { id: JANE, displayName: 'Jane Smith' } },
					},
					{
						upn: 'bob@example.com',
						role: 'attendee',
						identity: { user: { id: BOB, displayName: 'Bob Jones' } },
					},
				],
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['update.attendees.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
