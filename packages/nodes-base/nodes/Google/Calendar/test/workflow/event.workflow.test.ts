import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const recurringEvent = {
	id: 'kq3f8bhd2s1u6v0m4n7p9r5t2c',
	summary: 'Weekly sync',
	status: 'confirmed',
	recurrence: ['RRULE:FREQ=WEEKLY'],
};

const nextInstance = {
	id: 'kq3f8bhd2s1u6v0m4n7p9r5t2c_20261012T090000Z',
	summary: 'Weekly sync',
	recurringEventId: 'kq3f8bhd2s1u6v0m4n7p9r5t2c',
};

describe('Google Calendar Node - event request URLs', () => {
	beforeAll(() => {
		const groupCalendar = '/calendar/v3/calendars/c_8f2k1m4q7r@group.calendar.google.com';
		const teamCalendar = '/calendar/v3/calendars/team.planning@example.com';

		nock('https://www.googleapis.com')
			.post(`${groupCalendar}/events`)
			.reply(200, { id: recurringEvent.id, summary: 'Weekly sync', status: 'confirmed' })
			.get(`${teamCalendar}/events/kq3f8bhd2s1u6v0m4n7p9r5t2c`)
			.query(true)
			.reply(200, recurringEvent)
			.get(`${teamCalendar}/events/kq3f8bhd2s1u6v0m4n7p9r5t2c/instances`)
			.query(true)
			.reply(200, { items: [nextInstance] })
			.get(`${teamCalendar}/events`)
			.query(true)
			.reply(200, { items: [recurringEvent] })
			.get(`${teamCalendar}/events/kq3f8bhd2s1u6v0m4n7p9r5t2c/instances`)
			.query(true)
			.reply(200, { items: [nextInstance] })
			.get(`${teamCalendar}/events/kq3f8bhd2s1u6v0m4n7p9r5t2c_20261012T090000Z`)
			.query(true)
			.reply(200, nextInstance)
			.patch(`${teamCalendar}/events/kq3f8bhd2s1u6v0m4n7p9r5t2c`)
			.query(true)
			.reply(200, { id: recurringEvent.id, summary: 'Weekly sync (moved)', status: 'confirmed' })
			.delete(`${teamCalendar}/events/kq3f8bhd2s1u6v0m4n7p9r5t2c`)
			.reply(204);
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleCalendarOAuth2Api: {
				scope: 'https://www.googleapis.com/auth/calendar',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['event.workflow.json'],
	});
});
