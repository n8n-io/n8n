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

export function prepareFilterString(filters: IDataObject) {
	const selectedFilters = filters.filters as IDataObject;
	const filterString: string[] = [];

	if (selectedFilters.foldersToInclude) {
		const folders = (selectedFilters.foldersToInclude as string[])
			.filter((folder) => folder !== '')
			.map((folder) => `parentFolderId eq '${folder}'`)
			.join(' or ');

		filterString.push(folders);
	}

	if (selectedFilters.foldersToExclude) {
		for (const folder of selectedFilters.foldersToExclude as string[]) {
			filterString.push(`parentFolderId ne '${folder}'`);
		}
	}

	if (selectedFilters.sender) {
		const sender = selectedFilters.sender as string;
		const byMailAddress = `from/emailAddress/address eq '${sender}'`;
		const byName = `from/emailAddress/name eq '${sender}'`;
		filterString.push(`(${byMailAddress} or ${byName})`);
	}

	if (selectedFilters.hasAttachments) {
		filterString.push(`hasAttachments eq ${selectedFilters.hasAttachments}`);
	}

	if (selectedFilters.readStatus && selectedFilters.readStatus !== 'both') {
		filterString.push(`isRead eq ${selectedFilters.readStatus === 'read'}`);
	}

	if (selectedFilters.receivedAfter) {
		filterString.push(`receivedDateTime ge ${selectedFilters.receivedAfter}`);
	}

	if (selectedFilters.receivedBefore) {
		filterString.push(`receivedDateTime le ${selectedFilters.receivedBefore}`);
	}

	if (selectedFilters.custom) {
		filterString.push(selectedFilters.custom as string);
	}

	return filterString.length ? filterString.join(' and ') : undefined;
}
