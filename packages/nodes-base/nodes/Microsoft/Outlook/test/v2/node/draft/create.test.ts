import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, draft => create', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post('/messages', {
			bccRecipients: [
				{ emailAddress: { address: 'name1@mail.com' } },
				{ emailAddress: { address: 'name2@mail.com' } },
			],
			body: { content: 'draft message', contentType: 'Text' },
			categories: [
				'd10cd8f9-14ac-460e-a6ec-c40dd1876ea2',
				'6844a34e-4d23-4805-9fec-38b7f6e1a780',
				'fbf44fcd-7689-43a0-99c8-2c9faf6d825a',
			],
			importance: 'Normal',
			internetMessageHeaders: [{ name: 'x-my-header', value: 'header value' }],
			isReadReceiptRequested: true,
			replyTo: [{ emailAddress: { address: 'reply@mail.com' } }],
			subject: 'New Draft',
			toRecipients: [{ emailAddress: { address: 'some@mail.com' } }],
		})
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#users('b834447b-6848-4af9-8390-d2259ce46b74')/messages/$entity",
			'@odata.etag': 'W/"CQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFW3Bo2"',
			id: 'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAABZf4De-LkrSqpPI8eyjUmAAAFXBDupAAA=',
			createdDateTime: '2023-09-04T09:18:35Z',
			lastModifiedDateTime: '2023-09-04T09:18:35Z',
			changeKey: 'CQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFW3Bo2',
			categories: [
				'd10cd8f9-14ac-460e-a6ec-c40dd1876ea2',
				'6844a34e-4d23-4805-9fec-38b7f6e1a780',
				'fbf44fcd-7689-43a0-99c8-2c9faf6d825a',
			],
			receivedDateTime: '2023-09-04T09:18:35Z',
			sentDateTime: '2023-09-04T09:18:35Z',
			hasAttachments: false,
			internetMessageId:
				'<AM0PR10MB21003DD359041CBE7D64DDB6DDE9A@AM0PR10MB2100.EURPRD10.PROD.OUTLOOK.COM>',
			subject: 'New Draft',
			bodyPreview: 'draft message',
			importance: 'normal',
			parentFolderId:
				'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAuAAAAAABPLqzvT6b9RLP0CKzHiJrRAQBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAAA=',
			conversationId:
				'AAQkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAQAKELKTNBg5JJuTnBGaTDyl0=',
			conversationIndex: 'AQHZ3xDIoQspM0GDkkm5OcEZpMPKXQ==',
			isDeliveryReceiptRequested: false,
			isReadReceiptRequested: true,
			isRead: true,
			isDraft: true,
			webLink:
				'https://outlook.office365.com/owa/?ItemID=AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De%2FLkrSqpPI8eyjUmAAAAAAAEPAABZf4De%2FLkrSqpPI8eyjUmAAAFXBDupAAA%3D&exvsurl=1&viewmodel=ReadMessageItem',
			inferenceClassification: 'focused',
			body: {
				contentType: 'text',
				content: 'draft message',
			},
			toRecipients: [
				{
					emailAddress: {
						name: 'some@mail.com',
						address: 'some@mail.com',
					},
				},
			],
			ccRecipients: [],
			bccRecipients: [
				{
					emailAddress: {
						name: 'name1@mail.com',
						address: 'name1@mail.com',
					},
				},
				{
					emailAddress: {
						name: 'name2@mail.com',
						address: 'name2@mail.com',
					},
				},
			],
			replyTo: [
				{
					emailAddress: {
						name: 'reply@mail.com',
						address: 'reply@mail.com',
					},
				},
			],
			flag: {
				flagStatus: 'notFlagged',
			},
		});

	new NodeTestHarness().setupTests({
		workflowFiles: ['create.workflow.json'],
	});
});
