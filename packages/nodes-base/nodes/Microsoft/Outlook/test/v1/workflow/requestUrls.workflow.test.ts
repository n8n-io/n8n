import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const messageId =
	'AAMkAGVmMDEzMTM4LTExMWMtNDAxYy05MWNjLWQ5YTY3NWUzNzE4ZgBGAAAAAAA_iGOFSpJvRJ8V0rRW_J9FBwBZf4De_LkrSqpPI8eyjUmAAAACEDdwAABZf4De_LkrSqpPI8eyjUmAAAFSpKecAAA=';
const attachmentId =
	'AAMkAGVmMDEzMTM4LTExMWMtNDAxYy05MWNjLWQ5YTY3NWUzNzE4ZgBGAAAAAAA_iGOFSpJvRJ8V0rRW_J9FBwBZf4De_LkrSqpPI8eyjUmAAAACEDdwAABZf4De_LkrSqpPI8eyjUmAAAFSpKecAAABEgAQAKw7t5zN_jxDsbbpHhRYZtQ=';
const replyId =
	'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAABZf4De-LkrSqpPI8eyjUmAAAFXBDurAAA=';
const draftId =
	'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAABZf4De-LkrSqpPI8eyjUmAAAFXBEWwAAA=';
const folderId =
	'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAuAAAAAABPLqzvT6b9RLP0CKzHiJrRAQBZf4De-LkrSqpPI8eyjUmAAAFXBAEHAAA=';
const childFolderId =
	'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAuAAAAAABPLqzvT6b9RLP0CKzHiJrRAQBZf4De-LkrSqpPI8eyjUmAAAFXBAEIAAA=';

const message = { id: messageId, subject: 'Quarterly report', hasAttachments: true };
const attachment = { id: attachmentId, name: 'report.txt', contentType: 'text/plain' };

describe('Microsoft Outlook V1 - request URLs', () => {
	beforeAll(() => {
		const messagePath = `/v1.0/me/messages/${messageId}`;
		const attachments = `${messagePath}/attachments`;
		const folder = `/v1.0/me/mailFolders/${folderId}`;

		nock('https://graph.microsoft.com')
			.get(messagePath)
			.reply(200, message)
			.get(attachments)
			.query({ $top: 100 })
			.reply(200, { value: [attachment] })
			.get(`${attachments}/${attachmentId}/$value`)
			.reply(200, 'report body')
			.patch(messagePath, { subject: 'Quarterly report (final)' })
			.reply(200, { id: messageId, subject: 'Quarterly report (final)' })
			.post(`${messagePath}/move`, { destinationId: folderId })
			.reply(201, { id: messageId })
			.post(`${messagePath}/createReplyAll`, { comment: 'Thanks' })
			.reply(201, { id: replyId })
			.post(`/v1.0/me/messages/${replyId}/send`)
			.reply(202)
			.get(`${messagePath}/$value`)
			.reply(200, 'MIME-Version: 1.0', { 'content-type': 'message/rfc822' })
			.delete(messagePath)
			.reply(204)
			.get(`${attachments}/${attachmentId}`)
			.query({ $select: 'id,lastModifiedDateTime,name,contentType,size,isInline' })
			.reply(200, attachment)
			.get(attachments)
			.query({ $select: 'id,lastModifiedDateTime,name,contentType,size,isInline', $top: 100 })
			.reply(200, {
				value: [attachment],
				'@odata.nextLink': `https://graph.microsoft.com${attachments}?%24skip=100`,
			})
			.get(attachments)
			.query({
				$select: 'id,lastModifiedDateTime,name,contentType,size,isInline',
				$top: '100',
				$skip: '100',
			})
			.reply(200, { value: [] })
			.get(`${attachments}/${attachmentId}`)
			.query(true)
			.reply(200, attachment)
			.get(`${attachments}/${attachmentId}/$value`)
			.reply(200, 'report body')
			.patch(`/v1.0/me/messages/${draftId}`, {
				toRecipients: [{ emailAddress: { address: 'jane.smith@contoso.com' } }],
			})
			.reply(200, { id: draftId })
			.post(`/v1.0/me/messages/${draftId}/send`)
			.reply(202)
			.get(folder)
			.reply(200, { id: folderId, displayName: 'Invoices' })
			.get(`${folder}/childFolders`)
			.query({ $top: 1 })
			.reply(200, { value: [{ id: childFolderId, displayName: '2026' }] })
			.patch(folder, { displayName: 'Invoices 2026' })
			.reply(200, { id: folderId, displayName: 'Invoices 2026' })
			.delete(folder)
			.reply(204)
			.get(`/v1.0/me/mailFolders/${childFolderId}/messages`)
			.query({ $top: 1 })
			.reply(200, { value: [{ id: messageId, subject: 'Quarterly report' }] });
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			microsoftOutlookOAuth2Api: {
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['requestUrls.workflow.json'],
	});
});
