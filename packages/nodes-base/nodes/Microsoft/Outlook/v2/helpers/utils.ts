import { IDataObject } from 'n8n-workflow';

export const messageFields = [
	'bccRecipients',
	'body',
	'bodyPreview',
	'categories',
	'ccRecipients',
	'changeKey',
	'conversationId',
	'createdDateTime',
	'flag',
	'from',
	'hasAttachments',
	'importance',
	'inferenceClassification',
	'internetMessageId',
	'isDeliveryReceiptRequested',
	'isDraft',
	'isRead',
	'isReadReceiptRequested',
	'lastModifiedDateTime',
	'parentFolderId',
	'receivedDateTime',
	'replyTo',
	'sender',
	'sentDateTime',
	'subject',
	'toRecipients',
	'webLink',
].map((field) => ({ name: field, value: field }));

export const eventfields = [
	'allowNewTimeProposals',
	'attendees',
	'body',
	'bodyPreview',
	'categories',
	'changeKey',
	'createdDateTime',
	'end',
	'hasAttachments',
	'hideAttendees',
	'iCalUId',
	'importance',
	'isAllDay',
	'isCancelled',
	'isDraft',
	'isOnlineMeeting',
	'isOrganizer',
	'isReminderOn',
	'lastModifiedDateTime',
	'location',
	'locations',
	'onlineMeeting',
	'onlineMeetingProvider',
	'onlineMeetingUrl',
	'organizer',
	'originalEndTimeZone',
	'originalStartTimeZone',
	'recurrence',
	'reminderMinutesBeforeStart',
	'responseRequested',
	'responseStatus',
	'sensitivity',
	'seriesMasterId',
	'showAs',
	'start',
	'subject',
	'transactionId',
	'type',
	'webLink',
].map((field) => ({ name: field, value: field }));

export const contactFields = [
	'createdDateTime',
	'lastModifiedDateTime',
	'changeKey',
	'categories',
	'parentFolderId',
	'birthday',
	'fileAs',
	'displayName',
	'givenName',
	'initials',
	'middleName',
	'nickName',
	'surname',
	'title',
	'yomiGivenName',
	'yomiSurname',
	'yomiCompanyName',
	'generation',
	'imAddresses',
	'jobTitle',
	'companyName',
	'department',
	'officeLocation',
	'profession',
	'businessHomePage',
	'assistantName',
	'manager',
	'homePhones',
	'mobilePhone',
	'businessPhones',
	'spouseName',
	'personalNotes',
	'children',
	'emailAddresses',
	'homeAddress',
	'businessAddress',
	'otherAddress',
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

export function prepareContactFields(fields: IDataObject) {
	const typeStringCollection = [
		'businessPhones',
		'categories',
		'children',
		'homePhones',
		'imAddresses',
	];
	const typeValuesToExtract = ['businessAddress', 'emailAddresses', 'homePhones', 'otherAddress'];

	Object.keys(fields).map((field: string) => {
		if (typeStringCollection.includes(field) && fields[field] && !Array.isArray(fields[field])) {
			fields[field] = (fields[field] as string).split(',');
		}
		if (
			typeValuesToExtract.includes(field) &&
			(fields[field] as IDataObject).values !== undefined
		) {
			fields[field] = (fields[field] as IDataObject).values;
		}
	});

	return fields;
}
