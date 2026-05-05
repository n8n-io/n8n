import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, event => getAll', () => {
	const calendarId =
		'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAAAJ9-JDAAA=';

	const singleEvent = {
		id: 'AAMkADlhOTA0MTc5event1',
		subject: 'Single Event',
		bodyPreview: 'A one-time event',
		start: { dateTime: '2023-09-05T07:00:00.0000000', timeZone: 'UTC' },
		end: { dateTime: '2023-09-05T08:00:00.0000000', timeZone: 'UTC' },
		organizer: { emailAddress: { name: 'Test User', address: 'test@example.com' } },
		attendees: [],
		webLink: 'https://outlook.office365.com/owa/?itemid=event1',
	};

	const recurringInstance1 = {
		id: 'AAMkADlhOTA0MTc5recurring1',
		subject: 'Weekly Standup',
		bodyPreview: 'Recurring weekly meeting - instance 1',
		start: { dateTime: '2023-09-04T09:00:00.0000000', timeZone: 'UTC' },
		end: { dateTime: '2023-09-04T09:30:00.0000000', timeZone: 'UTC' },
		organizer: { emailAddress: { name: 'Test User', address: 'test@example.com' } },
		attendees: [],
		webLink: 'https://outlook.office365.com/owa/?itemid=recurring1',
	};

	const recurringInstance2 = {
		id: 'AAMkADlhOTA0MTc5recurring2',
		subject: 'Weekly Standup',
		bodyPreview: 'Recurring weekly meeting - instance 2',
		start: { dateTime: '2023-09-11T09:00:00.0000000', timeZone: 'UTC' },
		end: { dateTime: '2023-09-11T09:30:00.0000000', timeZone: 'UTC' },
		organizer: { emailAddress: { name: 'Test User', address: 'test@example.com' } },
		attendees: [],
		webLink: 'https://outlook.office365.com/owa/?itemid=recurring2',
	};

	const scope = nock('https://graph.microsoft.com/v1.0/me').persist();

	scope
		.get(`/calendars/${calendarId}/events`)
		.query(true)
		.reply(200, { value: [singleEvent] });

	scope
		.get(`/calendars/${calendarId}/calendarView`)
		.query(true)
		.reply(200, { value: [singleEvent, recurringInstance1, recurringInstance2] });

	afterAll(() => nock.cleanAll());

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json', 'getAllCalendarView.workflow.json'],
	});
});
