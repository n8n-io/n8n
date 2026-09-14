import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, event => getAll', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.get(
			'/calendars/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAAAJ9-JDAAA=/events',
		)
		.query(true)
		.reply(200, {
			value: [
				{
					id: 'AAMkADlhOTA0MTc5event1',
					subject: 'Single Event',
					bodyPreview: 'A one-time event',
					start: { dateTime: '2023-09-05T07:00:00.0000000', timeZone: 'UTC' },
					end: { dateTime: '2023-09-05T08:00:00.0000000', timeZone: 'UTC' },
					organizer: { emailAddress: { name: 'Test User', address: 'test@example.com' } },
					attendees: [],
					webLink: 'https://outlook.office365.com/owa/?itemid=event1',
				},
			],
		});

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
