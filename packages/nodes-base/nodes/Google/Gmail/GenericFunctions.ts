import type { OptionsWithUri } from 'request';

import { simpleParser } from 'mailparser';

import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	INode,
	INodeExecutionData,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { DateTime } from 'luxon';

import isEmpty from 'lodash.isempty';

export interface IEmail {
	from?: string;
	to?: string;
	cc?: string;
	bcc?: string;
	inReplyTo?: string;
	reference?: string;
	subject: string;
	body: string;
	htmlBody?: string;
	attachments?: IDataObject[];
}

export interface IAttachments {
	type: string;
	name: string;
	content: string;
}

import MailComposer from 'nodemailer/lib/mail-composer';
import { getGoogleAccessToken } from '../GenericFunctions';

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	let options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://www.googleapis.com${endpoint}`,
		qsStringifyOptions: {
			arrayFormat: 'repeat',
		},
		json: true,
	};

	options = Object.assign({}, options, option);

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		let credentialType = 'gmailOAuth2';
		const authentication = this.getNodeParameter('authentication', 0) as string;

		if (authentication === 'serviceAccount') {
			const credentials = await this.getCredentials('googleApi');
			credentialType = 'googleApi';

			const { access_token } = await getGoogleAccessToken.call(this, credentials, 'gmail');

			(options.headers as IDataObject).Authorization = `Bearer ${access_token}`;
		}

		const response = await this.helpers.requestWithAuthentication.call(
			this,
			credentialType,
			options,
		);
		return response;
	} catch (error) {
		if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
			error.statusCode = '401';
		}

		if (error.httpCode === '400') {
			if (error.cause && ((error.cause.message as string) || '').includes('Invalid id value')) {
				const resource = this.getNodeParameter('resource', 0) as string;
				const errorOptions = {
					message: `Invalid ${resource} ID`,
					description: `${
						resource.charAt(0).toUpperCase() + resource.slice(1)
					} IDs should look something like this: 182b676d244938bd`,
				};
				throw new NodeApiError(this.getNode(), error as JsonObject, errorOptions);
			}
		}

		if (error.httpCode === '404') {
			let resource = this.getNodeParameter('resource', 0) as string;
			if (resource === 'label') {
				resource = 'label ID';
			}
			const errorOptions = {
				message: `${resource.charAt(0).toUpperCase() + resource.slice(1)} not found`,
				description: '',
			};
			throw new NodeApiError(this.getNode(), error as JsonObject, errorOptions);
		}

		if (error.httpCode === '409') {
			const resource = this.getNodeParameter('resource', 0) as string;
			if (resource === 'label') {
				const errorOptions = {
					message: 'Label name exists already',
					description: '',
				};
				throw new NodeApiError(this.getNode(), error as JsonObject, errorOptions);
			}
		}

		if (error.code === 'EAUTH') {
			const errorOptions = {
				message: error?.body?.error_description || 'Authorization error',
				description: (error as Error).message,
			};
			throw new NodeApiError(this.getNode(), error as JsonObject, errorOptions);
		}

		if (
			((error.message as string) || '').includes('Bad request - please check your parameters') &&
			error.description
		) {
			const errorOptions = {
				message: error.description,
				description: '',
			};
			throw new NodeApiError(this.getNode(), error as JsonObject, errorOptions);
		}

		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: error.message,
			description: error.description,
		});
	}
}

export async function parseRawEmail(
	this: IExecuteFunctions | IPollFunctions,

	messageData: any,
	dataPropertyNameDownload: string,
): Promise<INodeExecutionData> {
	const messageEncoded = Buffer.from(messageData.raw as string, 'base64').toString('utf8');
	const responseData = await simpleParser(messageEncoded);

	const headers: IDataObject = {};
	for (const header of responseData.headerLines) {
		headers[header.key] = header.line;
	}

	const binaryData: IBinaryKeyData = {};
	if (responseData.attachments) {
		const downloadAttachments = this.getNodeParameter(
			'options.downloadAttachments',
			0,
			false,
		) as boolean;
		if (downloadAttachments) {
			for (let i = 0; i < responseData.attachments.length; i++) {
				const attachment = responseData.attachments[i];
				binaryData[`${dataPropertyNameDownload}${i}`] = await this.helpers.prepareBinaryData(
					attachment.content,
					attachment.filename,
					attachment.contentType,
				);
			}
		}
	}

	const mailBaseData: IDataObject = {};

	const resolvedModeAddProperties = ['id', 'threadId', 'labelIds', 'sizeEstimate'];

	for (const key of resolvedModeAddProperties) {
		mailBaseData[key] = messageData[key];
	}

	const json = Object.assign({}, mailBaseData, responseData, {
		headers,
		headerLines: undefined,
		attachments: undefined,
	}) as IDataObject;

	return {
		json,
		binary: Object.keys(binaryData).length ? binaryData : undefined,
	} as INodeExecutionData;
}

//------------------------------------------------------------------------------------------------------------------------------------------
// This function converts an email object into a MIME encoded email and then converts that string into base64 encoding
// for more info on MIME, https://docs.microsoft.com/en-us/previous-versions/office/developer/exchange-server-2010/aa494197(v%3Dexchg.140)
//------------------------------------------------------------------------------------------------------------------------------------------

export async function encodeEmail(email: IEmail) {
	// https://nodemailer.com/extras/mailcomposer/#e-mail-message-fields
	const mailOptions = {
		from: email.from,
		to: email.to,
		cc: email.cc,
		bcc: email.bcc,
		inReplyTo: email.inReplyTo,
		references: email.reference,
		subject: email.subject,
		text: email.body,
		keepBcc: true,
	} as IDataObject;

	if (email.htmlBody) {
		mailOptions.html = email.htmlBody;
	}

	if (
		email.attachments !== undefined &&
		Array.isArray(email.attachments) &&
		email.attachments.length > 0
	) {
		const attachments = email.attachments.map((attachment) => ({
			filename: attachment.name,
			content: attachment.content,
			contentType: attachment.type,
			encoding: 'base64',
		}));

		mailOptions.attachments = attachments;
	}

	const mail = new MailComposer(mailOptions).compile();

	// by default the bcc headers are deleted when the mail is built.
	// So add keepBcc flag to override such behaviour. Only works when
	// the flag is set after the compilation.
	// @ts-expect-error - https://nodemailer.com/extras/mailcomposer/#bcc
	mail.keepBcc = true;

	const mailBody = await mail.build();

	return mailBody.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body as IDataObject, query);
		query.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}

export function extractEmail(s: string) {
	if (s.includes('<')) {
		const data = s.split('<')[1];
		return data.substring(0, data.length - 1);
	}
	return s;
}

export const prepareTimestamp = (
	node: INode,
	itemIndex: number,
	query: string,
	dateValue: string | number | DateTime,
	label: 'after' | 'before',
) => {
	if (dateValue instanceof DateTime) {
		dateValue = dateValue.toISO();
	}

	let timestamp = DateTime.fromISO(dateValue as string).toSeconds();
	const timestampLengthInMilliseconds1990 = 12;

	if (typeof timestamp === 'number') {
		timestamp = Math.round(timestamp);
	}

	if (
		!timestamp &&
		typeof dateValue === 'number' &&
		dateValue.toString().length < timestampLengthInMilliseconds1990
	) {
		timestamp = dateValue;
	}

	if (!timestamp && (dateValue as string).length < timestampLengthInMilliseconds1990) {
		timestamp = parseInt(dateValue as string, 10);
	}

	if (!timestamp) {
		timestamp = Math.floor(DateTime.fromMillis(parseInt(dateValue as string, 10)).toSeconds());
	}

	if (!timestamp) {
		const description = `'${dateValue}' isn't a valid date and time. If you're using an expression, be sure to set an ISO date string or a timestamp.`;
		throw new NodeOperationError(
			node,
			`Invalid date/time in 'Received ${label[0].toUpperCase() + label.slice(1)}' field`,
			{
				description,
				itemIndex,
			},
		);
	}

	if (query) {
		query += ` ${label}:${timestamp}`;
	} else {
		query = `${label}:${timestamp}`;
	}
	return query;
};

export function prepareQuery(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	fields: IDataObject,
	itemIndex: number,
) {
	const qs: IDataObject = { ...fields };
	if (qs.labelIds) {
		if (qs.labelIds === '') {
			delete qs.labelIds;
		} else {
			qs.labelIds = qs.labelIds as string[];
		}
	}

	if (qs.sender) {
		if (qs.q) {
			qs.q += ` from:${qs.sender}`;
		} else {
			qs.q = `from:${qs.sender}`;
		}
		delete qs.sender;
	}

	if (qs.readStatus && qs.readStatus !== 'both') {
		if (qs.q) {
			qs.q += ` is:${qs.readStatus}`;
		} else {
			qs.q = `is:${qs.readStatus}`;
		}
		delete qs.readStatus;
	}

	if (qs.receivedAfter) {
		qs.q = prepareTimestamp(
			this.getNode(),
			itemIndex,
			qs.q as string,
			qs.receivedAfter as string,
			'after',
		);
		delete qs.receivedAfter;
	}

	if (qs.receivedBefore) {
		qs.q = prepareTimestamp(
			this.getNode(),
			itemIndex,
			qs.q as string,
			qs.receivedBefore as string,
			'before',
		);
		delete qs.receivedBefore;
	}

	return qs;
}

export function prepareEmailsInput(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	input: string,
	fieldName: string,
	itemIndex: number,
) {
	let emails = '';

	input.split(',').forEach((entry) => {
		const email = entry.trim();

		if (email.indexOf('@') === -1) {
			const description = `The email address '${email}' in the '${fieldName}' field isn't valid`;
			throw new NodeOperationError(this.getNode(), 'Invalid email address', {
				description,
				itemIndex,
			});
		}
		if (email.includes('<') && email.includes('>')) {
			emails += `${email},`;
		} else {
			emails += `<${email}>, `;
		}
	});

	return emails;
}

export function prepareEmailBody(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	itemIndex: number,
) {
	const emailType = this.getNodeParameter('emailType', itemIndex) as string;

	let body = '';
	let htmlBody = '';

	if (emailType === 'html') {
		htmlBody = (this.getNodeParameter('message', itemIndex, '') as string).trim();
	} else {
		body = (this.getNodeParameter('message', itemIndex, '') as string).trim();
	}

	return { body, htmlBody };
}

export async function prepareEmailAttachments(
	this: IExecuteFunctions,
	options: IDataObject,
	items: INodeExecutionData[],
	itemIndex: number,
) {
	const attachmentsList: IDataObject[] = [];
	const attachments = options.attachmentsBinary as IDataObject[];

	if (attachments && !isEmpty(attachments)) {
		for (const { property } of attachments) {
			for (const name of (property as string).split(',')) {
				const binaryData = this.helpers.assertBinaryData(itemIndex, name);
				const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, name);

				if (!Buffer.isBuffer(binaryDataBuffer)) {
					const description = `The input field '${name}' doesn't contain an attachment. Please make sure you specify a field containing binary data`;
					throw new NodeOperationError(this.getNode(), 'Attachment not found', {
						description,
						itemIndex,
					});
				}

				attachmentsList.push({
					name: binaryData.fileName || 'unknown',
					content: binaryDataBuffer,
					type: binaryData.mimeType,
				});
			}
		}
	}
	return attachmentsList;
}

export function unescapeSnippets(items: INodeExecutionData[]) {
	const result = items.map((item) => {
		const snippet = item.json.snippet as string;
		if (snippet) {
			item.json.snippet = snippet.replace(/&amp;|&lt;|&gt;|&#39;|&quot;/g, (match) => {
				switch (match) {
					case '&amp;':
						return '&';
					case '&lt;':
						return '<';
					case '&gt;':
						return '>';
					case '&#39;':
						return "'";
					case '&quot;':
						return '"';
					default:
						return match;
				}
			});
		}
		return item;
	});
	return result;
}

export async function replayToEmail(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	gmailId: string,
	options: IDataObject,
	itemIndex: number,
) {
	let qs: IDataObject = {};

	let cc = '';
	let bcc = '';

	if (options.ccList) {
		cc = prepareEmailsInput.call(this, options.ccList as string, 'CC', itemIndex);
	}

	if (options.bccList) {
		bcc = prepareEmailsInput.call(this, options.bccList as string, 'BCC', itemIndex);
	}
	let attachments: IDataObject[] = [];
	if (options.attachmentsUi) {
		attachments = await prepareEmailAttachments.call(
			this,
			options.attachmentsUi as IDataObject,
			items,
			itemIndex,
		);
		if (attachments.length) {
			qs = {
				userId: 'me',
				uploadType: 'media',
			};
		}
	}

	const endpoint = `/gmail/v1/users/me/messages/${gmailId}`;

	qs.format = 'metadata';

	const { payload, threadId } = await googleApiRequest.call(this, 'GET', endpoint, {}, qs);

	const subject =
		payload.headers.filter(
			(data: { [key: string]: string }) => data.name.toLowerCase() === 'subject',
		)[0]?.value || '';

	const messageIdGlobal =
		payload.headers.filter(
			(data: { [key: string]: string }) => data.name.toLowerCase() === 'message-id',
		)[0]?.value || '';

	const { emailAddress } = await googleApiRequest.call(this, 'GET', '/gmail/v1/users/me/profile');

	let to = '';
	const replyToSenderOnly =
		options.replyToSenderOnly === undefined ? false : (options.replyToSenderOnly as boolean);

	const prepareEmailString = (email: string) => {
		if (email.includes(emailAddress as string)) return;
		if (email.includes('<') && email.includes('>')) {
			to += `${email}, `;
		} else {
			to += `<${email}>, `;
		}
	};

	for (const header of payload.headers as IDataObject[]) {
		if (((header.name as string) || '').toLowerCase() === 'from') {
			const from = header.value as string;
			if (from.includes('<') && from.includes('>')) {
				to += `${from}, `;
			} else {
				to += `<${from}>, `;
			}
		}

		if (((header.name as string) || '').toLowerCase() === 'to' && !replyToSenderOnly) {
			const toEmails = header.value as string;
			toEmails.split(',').forEach(prepareEmailString);
		}
	}

	let from = '';
	if (options.senderName) {
		from = `${options.senderName as string} <${emailAddress}>`;
	}

	const email: IEmail = {
		from,
		to,
		cc,
		bcc,
		subject,
		attachments,
		inReplyTo: messageIdGlobal,
		reference: messageIdGlobal,
		...prepareEmailBody.call(this, itemIndex),
	};

	const body = {
		raw: await encodeEmail(email),
		threadId,
	};

	return googleApiRequest.call(this, 'POST', '/gmail/v1/users/me/messages/send', body, qs);
}

export async function simplifyOutput(
	this: IExecuteFunctions | IPollFunctions,
	data: IDataObject[],
) {
	const labelsData = await googleApiRequest.call(this, 'GET', '/gmail/v1/users/me/labels');
	const labels = ((labelsData.labels as IDataObject[]) || []).map(({ id, name }) => ({
		id,
		name,
	}));
	return (data || []).map((item) => {
		if (item.labelIds) {
			item.labels = labels.filter((label) =>
				(item.labelIds as string[]).includes(label.id as string),
			);
			delete item.labelIds;
		}
		if (item.payload && (item.payload as IDataObject).headers) {
			const { headers } = item.payload as IDataObject;
			((headers as IDataObject[]) || []).forEach((header) => {
				item[header.name as string] = header.value;
			});
			delete (item.payload as IDataObject).headers;
		}
		return item;
	});
}
