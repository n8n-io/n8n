import { IDataObject, INodeExecutionData, NodeApiError } from 'n8n-workflow';

export const messageFields = [
	'createdDateTime',
	'lastModifiedDateTime',
	'changeKey',
	'categories',
	'receivedDateTime',
	'sentDateTime',
	'hasAttachments',
	'internetMessageId',
	'subject',
	'bodyPreview',
	'importance',
	'parentFolderId',
	'conversationId',
	'isDeliveryReceiptRequested',
	'isReadReceiptRequested',
	'isRead',
	'isDraft',
	'webLink',
	'inferenceClassification',
	'body',
	'sender',
	'from',
	'toRecipients',
	'ccRecipients',
	'bccRecipients',
	'replyTo',
	'flag',
].map((field) => ({ name: field, value: field }));

export function makeRecipient(email: string) {
	return {
		emailAddress: {
			address: email,
		},
	};
}

export function createMessage(fields: IDataObject) {
	const message: IDataObject = {};

	// Create body object
	if (fields.bodyContent || fields.bodyContentType) {
		const bodyObject = {
			content: fields.bodyContent,
			contentType: fields.bodyContentType,
		};

		message['body'] = bodyObject;
		delete fields['bodyContent'];
		delete fields['bodyContentType'];
	}

	// Handle custom headers
	if (
		'internetMessageHeaders' in fields &&
		'headers' in (fields.internetMessageHeaders as IDataObject)
	) {
		fields.internetMessageHeaders = (fields.internetMessageHeaders as IDataObject).headers;
	}

	// Handle recipient fields
	['bccRecipients', 'ccRecipients', 'replyTo', 'sender', 'toRecipients'].forEach((key) => {
		if (Array.isArray(fields[key])) {
			fields[key] = (fields[key] as string[]).map((email) => makeRecipient(email));
		} else if (fields[key] !== undefined) {
			fields[key] = (fields[key] as string)
				.split(',')
				.map((recipient: string) => makeRecipient(recipient));
		}
	});

	['from', 'sender'].forEach((key) => {
		if (fields[key] !== undefined) {
			fields[key] = makeRecipient(fields[key] as string);
		}
	});

	Object.assign(message, fields);

	return message;
}

export function simplifyOutputMessages(data: IDataObject[]) {
	return data.map((item: IDataObject) => {
		return {
			id: item.id,
			conversationId: item.conversationId,
			subject: item.subject,
			bodyPreview: item.bodyPreview,
			from: ((item.from as IDataObject)?.emailAddress as IDataObject)?.address,
			to: (item.toRecipients as IDataObject[]).map(
				(recipient: IDataObject) => (recipient.emailAddress as IDataObject)?.address,
			),
			categories: item.categories,
			hasAttachments: item.hasAttachments,
		};
	});
}
