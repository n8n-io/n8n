import {
	OptionsWithUri,
} from 'request';

import {
	ParsedMail,
	simpleParser,
} from 'mailparser';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	IEmail,
} from './Gmail.node';

const mailComposer = require('nodemailer/lib/mail-composer');

export async function googleApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string,
	endpoint: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	let options: OptionsWithUri = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://www.googleapis.com${endpoint}`,
		json: true,
	};

	options = Object.assign({}, options, option);

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'gmailOAuth2', options);

	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errorMessages;

			if (error.response.body.error.errors) {
				// Try to return the error prettier
				errorMessages = error.response.body.error.errors;

				errorMessages = errorMessages.map((errorItem: IDataObject) => errorItem.message);

				errorMessages = errorMessages.join('|');

			} else if (error.response.body.error.message) {
				errorMessages = error.response.body.error.message;
			}

			throw new Error(`Gmail error response [${error.statusCode}]: ${errorMessages}`);
		}
		throw error;
	}
}


export async function parseRawEmail(this: IExecuteFunctions, messageData: any, dataPropertyNameDownload: string): Promise<INodeExecutionData> { // tslint:disable-line:no-any

	const messageEncoded = Buffer.from(messageData.raw, 'base64').toString('utf8');
	let responseData = await simpleParser(messageEncoded);

	const headers: IDataObject = {};
	// @ts-ignore
	for (const header of responseData.headerLines) {
		headers[header.key] = header.line;
	}

	// @ts-ignore
	responseData.headers = headers;
	// @ts-ignore
	responseData.headerLines = undefined;

	const binaryData: IBinaryKeyData = {};
	if (responseData.attachments) {

		for (let i = 0; i < responseData.attachments.length; i++) {
			const attachment = responseData.attachments[i];
			binaryData[`${dataPropertyNameDownload}${i}`] = await this.helpers.prepareBinaryData(attachment.content, attachment.filename, attachment.contentType);
		}
		// @ts-ignore
		responseData.attachments = undefined;
	}

	const mailBaseData: IDataObject = {};

	const resolvedModeAddProperties = [
		'id',
		'threadId',
		'labelIds',
		'sizeEstimate',
	];

	for (const key of resolvedModeAddProperties) {
		// @ts-ignore
		mailBaseData[key] = messageData[key];
	}

	responseData = Object.assign(mailBaseData, responseData);

	return {
		json: responseData as unknown as IDataObject,
		binary: Object.keys(binaryData).length ? binaryData : undefined,
	} as INodeExecutionData;
}


//------------------------------------------------------------------------------------------------------------------------------------------
// This function converts an email object into a MIME encoded email and then converts that string into base64 encoding
// for more info on MIME, https://docs.microsoft.com/en-us/previous-versions/office/developer/exchange-server-2010/aa494197(v%3Dexchg.140)
//------------------------------------------------------------------------------------------------------------------------------------------

export async function encodeEmail(email: IEmail) {
	let mailBody: Buffer;

	const mailOptions = {
		to: email.to,
		cc: email.cc,
		bcc: email.bcc,
		replyTo: email.inReplyTo,
		references: email.reference,
		subject: email.subject,
		text: email.body,
	} as IDataObject;
	if (email.htmlBody) {
		mailOptions.html = email.htmlBody;
	}

	if (email.attachments !== undefined && Array.isArray(email.attachments) && email.attachments.length > 0) {
		const attachments = email.attachments.map((attachment) => ({
			filename: attachment.name,
			content: attachment.content,
			contentType: attachment.type,
			encoding: 'base64',
		}));

		mailOptions.attachments = attachments;
	}


	const mail = new mailComposer(mailOptions);

	mailBody = await new Promise((resolve) => {
		mail.compile().build(async (err: string, result: Buffer) => {
			resolve(result);
		});
	});

	return mailBody.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function googleApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query);
		query.pageToken = responseData['nextPageToken'];
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData['nextPageToken'] !== undefined &&
		responseData['nextPageToken'] !== ''
	);

	return returnData;
}

export function extractEmail(s: string) {
	const data = s.split('<')[1];
	return data.substring(0, data.length - 1);
}
