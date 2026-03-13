import isEmpty from 'lodash/isEmpty';
import { DateTime } from 'luxon';
import { Readable } from 'stream';
import PostalMime from 'postal-mime';
import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INode,
	INodeExecutionData,
	INodePropertyOptions,
	IPollFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import MailComposer from 'nodemailer/lib/mail-composer';

import type { IEmail } from '../../../utils/sendAndWait/interfaces';
import { createUtmCampaignLink, escapeHtml } from '../../../utils/utilities';
import { getGoogleAccessToken } from '../GenericFunctions';
import { toMailparserShape } from '../../../utils/postalMimeToMailparserShape';

export interface IAttachments {
	type: string;
	name: string;
	content: string;
}

export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	let options: IRequestOptions = {
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

type PostalMimeAddress = {
	name?: string;
	address?: string;
	group?: Array<{ name?: string; address?: string }>;
};

/** Format a PostalMime Address (Mailbox or group) as a single string for text/html. */
function formatAddress(addr: PostalMimeAddress | undefined): string {
	if (!addr) return '';
	if ('address' in addr && addr.address) return addr.address;
	if ('group' in addr && Array.isArray(addr.group)) {
		return addr.group
			.map((m) => m.address)
			.filter(Boolean)
			.join(', ');
	}
	return '';
}

/** Map PostalMime Address to mailparser-like value array (name, address). */
function addressToValue(
	addr: PostalMimeAddress | undefined,
): Array<{ name: string; address: string }> {
	if (!addr) return [];
	if ('address' in addr && addr.address) {
		return [{ name: addr.name ?? '', address: addr.address }];
	}
	if ('group' in addr && Array.isArray(addr.group)) {
		return addr.group.map((m) => ({ name: m.name ?? '', address: m.address ?? '' }));
	}
	return [];
}

export interface ParseRawEmailOptions {
	/** When 'simple', return PostalMime-native shape (plain from/to, no textAsHtml). When 'mailparser', return mailparser-compatible shape. Default 'mailparser'. */
	outputFormat?: 'mailparser' | 'simple';
}

export async function parseRawEmail(
	this: IExecuteFunctions | IPollFunctions,
	messageData: any,
	dataPropertyNameDownload: string,
	options?: ParseRawEmailOptions,
): Promise<INodeExecutionData> {
	const buffer = Buffer.from(messageData.raw as string, 'base64');
	const CHUNK_SIZE = 64 * 1024;
	function* chunkIterator() {
		for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
			yield buffer.subarray(i, Math.min(i + CHUNK_SIZE, buffer.length));
		}
	}
	const nodeStream = Readable.from(chunkIterator());
	const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
	const email = await PostalMime.parse(webStream);

	const headers: IDataObject = {};
	for (const h of email.headerLines ?? []) {
		headers[h.key] = h.line;
	}

	const binaryData: IBinaryKeyData = {};
	if (email.attachments?.length) {
		const downloadAttachments = this.getNodeParameter(
			'options.downloadAttachments',
			0,
			false,
		) as boolean;
		if (downloadAttachments) {
			for (let i = 0; i < email.attachments.length; i++) {
				const att = email.attachments[i];
				const content =
					att.content instanceof ArrayBuffer
						? Buffer.from(att.content)
						: typeof att.content === 'string'
							? Buffer.from(att.content, att.encoding === 'base64' ? 'base64' : 'utf8')
							: Buffer.from(att.content as Uint8Array);
				binaryData[`${dataPropertyNameDownload}${i}`] = await this.helpers.prepareBinaryData(
					content,
					att.filename ?? 'attachment',
					att.mimeType,
				);
			}
		}
	}

	const mailBaseData: IDataObject = {};
	const resolvedModeAddProperties = ['id', 'threadId', 'labelIds', 'sizeEstimate'];
	for (const key of resolvedModeAddProperties) {
		const value = messageData[key];
		if (value !== undefined) mailBaseData[key] = value;
	}

	const fromFormatted = formatAddress(email.from);
	const toFormatted =
		email.to
			?.map((a: PostalMimeAddress) => formatAddress(a))
			.filter(Boolean)
			.join(', ') ?? '';
	const ccFormatted =
		email.cc
			?.map((a: PostalMimeAddress) => formatAddress(a))
			.filter(Boolean)
			.join(', ') ?? '';
	const bccFormatted =
		email.bcc
			?.map((a: PostalMimeAddress) => formatAddress(a))
			.filter(Boolean)
			.join(', ') ?? '';
	const replyToFormatted =
		email.replyTo
			?.map((a: PostalMimeAddress) => formatAddress(a))
			.filter(Boolean)
			.join(', ') ?? '';
	const json: IDataObject = {
		...mailBaseData,
		headers,
		date: email.date ?? undefined,
		from: {
			text: fromFormatted,
			value: addressToValue(email.from),
			html: fromFormatted,
		},
		to: {
			text: toFormatted,
			value: (email.to ?? []).flatMap((a: PostalMimeAddress) => addressToValue(a)),
			html: toFormatted,
		},
		html: email.html,
		text: email.text,
	};
	if (email.subject !== undefined) json.subject = email.subject;
	if (email.messageId !== undefined) json.messageId = email.messageId;
	if (email.inReplyTo !== undefined) json.inReplyTo = email.inReplyTo;
	if (email.references !== undefined) json.references = email.references;

	const useMailparserShape = options?.outputFormat !== 'simple';
	// Only add mailparser-only address/header fields when returning mailparser shape;
	// keep Gmail Trigger's outputFormat: 'simple' payload unchanged.
	if (useMailparserShape) {
		if (ccFormatted) {
			json.cc = {
				text: ccFormatted,
				value: (email.cc ?? []).flatMap((a: PostalMimeAddress) => addressToValue(a)),
				html: ccFormatted,
			};
		}
		if (bccFormatted) {
			json.bcc = {
				text: bccFormatted,
				value: (email.bcc ?? []).flatMap((a: PostalMimeAddress) => addressToValue(a)),
				html: bccFormatted,
			};
		}
		if (replyToFormatted) {
			json.replyTo = {
				text: replyToFormatted,
				value: (email.replyTo ?? []).flatMap((a: PostalMimeAddress) => addressToValue(a)),
				html: replyToFormatted,
			};
		}
		if (email.deliveredTo !== undefined) json.deliveredTo = email.deliveredTo;
		if (email.returnPath !== undefined) json.returnPath = email.returnPath;
		if (email.sender !== undefined) {
			const senderFormatted = formatAddress(email.sender);
			if (senderFormatted) {
				json.sender = {
					text: senderFormatted,
					value: addressToValue(email.sender),
					html: senderFormatted,
				};
			}
		}
	}
	const jsonOut = useMailparserShape
		? toMailparserShape(json)
		: (() => {
				for (const key of Object.keys(json)) {
					if (json[key] === undefined) delete json[key];
				}
				return json;
			})();

	const result: INodeExecutionData = { json: jsonOut };
	if (Object.keys(binaryData).length) result.binary = binaryData;
	return result;
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
		replyTo: email.replyTo,
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
	mail.keepBcc = true;

	const mailBody = await mail.build();

	return mailBody.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
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
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
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
	}
	delete qs.readStatus;

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
	this: IExecuteFunctions | ILoadOptionsFunctions,
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
	this: IExecuteFunctions | ILoadOptionsFunctions,
	itemIndex: number,
	appendAttribution = false,
	instanceId?: string,
) {
	const emailType = this.getNodeParameter('emailType', itemIndex) as string;
	let message = (this.getNodeParameter('message', itemIndex, '') as string).trim();

	if (appendAttribution) {
		const attributionText = 'This email was sent automatically with ';
		const link = createUtmCampaignLink('n8n-nodes-base.gmail', instanceId);
		if (emailType === 'html') {
			message = `
			${message}
			<br>
			<br>
			---
			<br>
			<em>${attributionText}<a href="${link}" target="_blank">n8n</a></em>
			`;
		} else {
			message = `${message}\n\n---\n${attributionText}n8n\n${'https://n8n.io'}`;
		}
	}

	const body = {
		body: '',
		htmlBody: '',
	};

	if (emailType === 'html') {
		body.htmlBody = message;
	} else {
		body.body = message;
	}

	return body;
}

export async function prepareEmailAttachments(
	this: IExecuteFunctions,
	options: IDataObject,
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
			item.json.snippet = escapeHtml(snippet);
		}
		return item;
	});
	return result;
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

/**
 * Get all the labels to display them to user so that they can select them easily
 */
export async function getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const labels = await googleApiRequestAllItems.call(
		this,
		'labels',
		'GET',
		'/gmail/v1/users/me/labels',
	);

	for (const label of labels) {
		returnData.push({
			name: label.name,
			value: label.id,
		});
	}

	return returnData.sort((a, b) => {
		if (a.name < b.name) {
			return -1;
		}
		if (a.name > b.name) {
			return 1;
		}
		return 0;
	});
}
