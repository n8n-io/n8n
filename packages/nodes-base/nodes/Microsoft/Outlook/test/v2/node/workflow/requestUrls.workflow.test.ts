import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const messageId =
	'AAMkAGVmMDEzMTM4LTExMWMtNDAxYy05MWNjLWQ5YTY3NWUzNzE4ZgBGAAAAAAA_iGOFSpJvRJ8V0rRW_J9FBwBZf4De_LkrSqpPI8eyjUmAAAACEDdwAABZf4De_LkrSqpPI8eyjUmAAAFSpKecAAA=';
const attachmentId =
	'AAMkAGVmMDEzMTM4LTExMWMtNDAxYy05MWNjLWQ5YTY3NWUzNzE4ZgBGAAAAAAA_iGOFSpJvRJ8V0rRW_J9FBwBZf4De_LkrSqpPI8eyjUmAAAACEDdwAABZf4De_LkrSqpPI8eyjUmAAAFSpKecAAABEgAQAKw7t5zN_jxDsbbpHhRYZtQ=';
const draftId =
	'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAABZf4De-LkrSqpPI8eyjUmAAAFXBEWwAAA=';
const eventId =
	'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAENAABZf4De-LkrSqpPI8eyjUmAAAFXBBiTAAA=';
const folderId =
	'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAuAAAAAABPLqzvT6b9RLP0CKzHiJrRAQBZf4De-LkrSqpPI8eyjUmAAAFXBAEHAAA=';
const contactId =
	'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAEOAABZf4De-LkrSqpPI8eyjUmAAAFXBDf-AAA=';
const calendarGroupId =
	'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAEGAAA=';
const calendarId =
	'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAAFXBCOAAAA=';

const attachment = { id: attachmentId, name: 'report.txt', contentType: 'text/plain' };

describe('Microsoft Outlook V2 - request URLs', () => {
	beforeAll(() => {
		const message = `/v1.0/me/messages/${messageId}`;
		const attachments = `${message}/attachments`;
		const folder = `/v1.0/me/mailFolders/${folderId}`;

		nock('https://graph.microsoft.com')
			.get(message)
			.query(true)
			.reply(200, { id: messageId, subject: 'Quarterly report', hasAttachments: true })
			.get(attachments)
			.query({ $top: 100 })
			.reply(200, { value: [attachment] })
			.get(`${attachments}/${attachmentId}/$value`)
			.reply(200, 'report body')
			.get(`${message}/$value`)
			.reply(200, 'MIME-Version: 1.0', { 'content-type': 'message/rfc822' })
			.patch(message, { subject: 'Quarterly report (final)' })
			.reply(200, { id: messageId, subject: 'Quarterly report (final)' })
			.delete(message)
			.reply(204)
			.get(`${attachments}/${attachmentId}`)
			.query(true)
			.reply(200, attachment)
			.get(attachments)
			.query(true)
			.reply(200, {
				value: [attachment],
				'@odata.nextLink': `https://graph.microsoft.com${attachments}?%24top=100&%24skip=100`,
			})
			.get(attachments)
			.query({ $top: '100', $skip: '100' })
			.reply(200, { value: [] })
			.get(`${attachments}/${attachmentId}`)
			.query(true)
			.reply(200, attachment)
			.get(`${attachments}/${attachmentId}/$value`)
			.reply(200, 'report body')
			.get(`/v1.0/me/messages/${draftId}`)
			.query(true)
			.reply(200, { id: draftId, subject: 'Draft' })
			.patch(`/v1.0/me/messages/${draftId}`, { subject: 'Draft (edited)' })
			.reply(200, { id: draftId, subject: 'Draft (edited)' })
			.delete(`/v1.0/me/messages/${draftId}`)
			.reply(204)
			.get(`/v1.0/me/calendar/events/${eventId}`)
			.query(true)
			.reply(200, { id: eventId, subject: 'Planning' })
			.patch(`/v1.0/me/calendar/events/${eventId}`, { subject: 'Planning (moved)' })
			.reply(200, { id: eventId, subject: 'Planning (moved)' })
			.delete(`/v1.0/me/calendar/events/${eventId}`)
			.reply(204)
			.post(`/v1.0/me/calendarGroups/${calendarGroupId}/calendars`, { name: 'Team' })
			.reply(201, { id: calendarId, name: 'Team' })
			.get(`/v1.0/me/contacts/${contactId}`)
			.query(true)
			.reply(200, { id: contactId, displayName: 'Jane Smith' })
			.get('/v1.0/me/contacts')
			.query(true)
			.reply(200, { value: [{ id: contactId, displayName: 'Jane Smith' }] })
			.delete(`/v1.0/me/contacts/${contactId}`)
			.reply(204)
			.post(`${folder}/childFolders`, { displayName: 'Invoices' })
			.reply(201, { id: folderId, displayName: 'Invoices' })
			.get(folder)
			.reply(200, { id: folderId, displayName: 'Invoices' })
			.get(`${folder}/childFolders`)
			.query({ $top: 1 })
			.reply(200, { value: [{ id: folderId, displayName: 'Invoices' }] })
			.patch(folder, { displayName: 'Invoices 2026' })
			.reply(200, { id: folderId, displayName: 'Invoices 2026' })
			.delete(folder)
			.reply(204);
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			microsoftOutlookOAuth2Api: {
				accessToken: 'test-access-token',
				refreshToken: 'test-refresh-token',
			},
		},
		workflowFiles: ['requestUrls.workflow.json'],
	});
});
