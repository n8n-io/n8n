import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, message => reply', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/messages/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEJAABZf4De-LkrSqpPI8eyjUmAAAFXBEVwAAA=/createReply',
			{
				message: {
					body: { content: 'Reply message', contentType: 'html' },
					importance: 'High',
					subject: 'Reply Subject',
				},
			},
		)
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#users('b834447b-6848-4af9-8390-d2259ce46b74')/messages/$entity",
			'@odata.etag': 'W/"CQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFW3CX+"',
			id: 'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAABZf4De-LkrSqpPI8eyjUmAAAFXBDurAAA=',
			createdDateTime: '2023-09-04T12:29:59Z',
			lastModifiedDateTime: '2023-09-04T12:29:59Z',
			changeKey: 'CQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFW3CX+',
			categories: [],
			receivedDateTime: '2023-09-04T12:29:59Z',
			sentDateTime: '2023-09-04T12:29:59Z',
			hasAttachments: false,
			internetMessageId:
				'<AM0PR10MB2100903A148F1623165004E3DDE9A@AM0PR10MB2100.EURPRD10.PROD.OUTLOOK.COM>',
			subject: 'Reply Subject',
			bodyPreview: 'Reply message',
			importance: 'high',
			parentFolderId:
				'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAuAAAAAABPLqzvT6b9RLP0CKzHiJrRAQBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAAA=',
			conversationId:
				'AAQkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAQAKwkQLinj69KtoFOxMG2lVY=',
			conversationIndex: 'AQHZ3yq3rCRAuKePr0q2gU7EwbaVVrAKmLQ4',
			isDeliveryReceiptRequested: false,
			isReadReceiptRequested: false,
			isRead: true,
			isDraft: true,
			webLink:
				'https://outlook.office365.com/owa/?ItemID=AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De%2FLkrSqpPI8eyjUmAAAAAAAEPAABZf4De%2FLkrSqpPI8eyjUmAAAFXBDurAAA%3D&exvsurl=1&viewmodel=ReadMessageItem',
			inferenceClassification: 'focused',
			body: {
				contentType: 'html',
				content:
					'<html><head>\r\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body>Reply message </body></html>',
			},
			sender: {
				emailAddress: {
					name: 'Michael Kret',
					address: 'MichaelDevSandbox@5w1hb7.onmicrosoft.com',
				},
			},
			from: {
				emailAddress: {
					name: 'Michael Kret',
					address: 'MichaelDevSandbox@5w1hb7.onmicrosoft.com',
				},
			},
			toRecipients: [
				{
					emailAddress: {
						name: 'reply@mail.com',
						address: 'reply@mail.com',
					},
				},
			],
			ccRecipients: [],
			bccRecipients: [],
			replyTo: [],
			flag: {
				flagStatus: 'notFlagged',
			},
		})
		.post(
			'/messages/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAABZf4De-LkrSqpPI8eyjUmAAAFXBDurAAA=/send',
		)
		.reply(200);

	new NodeTestHarness().setupTests({
		workflowFiles: ['reply.workflow.json'],
	});
});
