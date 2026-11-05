import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const JANE = '11111111-1111-1111-1111-111111111111';

// The cached RLC name in the fixture is stale ("Jane (stale)"), so the principal name in the
// body can only come from the lookup. `pendingMocks` makes a skipped lookup fail loudly.
describe('Test MicrosoftTeamsV2, onlineMeeting => createOrGet with attendees', () => {
	nock('https://graph.microsoft.com')
		.get(`/v1.0/users/${JANE}`)
		.query({ $select: 'id,displayName,userPrincipalName' })
		.reply(200, { id: JANE, displayName: 'Jane Smith', userPrincipalName: 'jane@example.com' });

	nock('https://graph.microsoft.com')
		.matchHeader('Prefer', 'include-unknown-enum-members')
		.post('/v1.0/me/onlineMeetings/createOrGet', {
			externalId: 'order-4711-kickoff',
			subject: 'Order 4711 kickoff',
			participants: {
				attendees: [
					{ identity: { user: { id: JANE } }, upn: 'jane@example.com', role: 'attendee' },
				],
			},
		})
		.reply(201, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#users('11111111-2222-3333-4444-555555555555')/onlineMeetings/$entity",
			id: 'MSpjcmVhdGVPckdldC1hdHRlbmRlZXM',
			creationDateTime: '2026-09-02T14:00:00.123Z',
			startDateTime: '2026-09-02T14:00:00Z',
			endDateTime: '2026-09-02T15:00:00Z',
			joinWebUrl: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_a2lja29mZg%40thread.v2/0',
			subject: 'Order 4711 kickoff',
			externalId: 'order-4711-kickoff',
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
						role: 'attendee',
						identity: { user: { id: JANE, displayName: 'Jane Smith' } },
					},
				],
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['createOrGet.attendees.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
