import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

// Nested calendar path under the SP mailbox: /users/{encoded-mailbox}/calendars/{id}/events.
describe('Test MicrosoftOutlookV2, Service Principal => event:getAll', () => {
	const credentials = {
		microsoftEntraServicePrincipalApi: {
			accessToken: 'test-access-token',
			tenantId: '11111111-1111-1111-1111-111111111111',
			clientId: '22222222-2222-2222-2222-222222222222',
			clientSecret: 'secret',
			graphApiBaseUrl: 'https://graph.microsoft.com',
		},
	};

	beforeAll(() => {
		nock('https://graph.microsoft.com')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.get('/v1.0/users/user%40example.com/calendars/AAMkADlhOTA0-calendar-id=/events')
			.query({
				$select: 'id,subject,bodyPreview,start,end,organizer,attendees,webLink',
				$top: 10,
			})
			.reply(200, {
				value: [
					{
						id: 'event-1',
						subject: 'Single Event',
						bodyPreview: 'A one-time event',
						start: { dateTime: '2023-09-05T07:00:00.0000000', timeZone: 'UTC' },
						end: { dateTime: '2023-09-05T08:00:00.0000000', timeZone: 'UTC' },
						organizer: { emailAddress: { name: 'Test User', address: 'test@example.com' } },
						attendees: [],
						webLink: 'https://outlook.office365.com/owa/?itemid=event-1',
					},
				],
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['eventGetAll.workflow.json'],
	});
});
