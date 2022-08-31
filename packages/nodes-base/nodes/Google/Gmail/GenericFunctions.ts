import { OptionsWithUri } from 'request';

import { simpleParser } from 'mailparser';

import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { IEmail } from './Gmail.node';

import moment from 'moment-timezone';

import jwt from 'jsonwebtoken';

interface IGoogleAuthCredentials {
	delegatedEmail?: string;
	email: string;
	inpersonate: boolean;
	privateKey: string;
}

const mailComposer = require('nodemailer/lib/mail-composer');

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const authenticationMethod = this.getNodeParameter(
		'authentication',
		0,
		'serviceAccount',
	) as string;
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

		if (authenticationMethod === 'serviceAccount') {
			const credentials = await this.getCredentials('googleApi');

			const { access_token } = await getAccessToken.call(
				this,
				credentials as unknown as IGoogleAuthCredentials,
			);

			options.headers!.Authorization = `Bearer ${access_token}`;
			//@ts-ignore
			return await this.helpers.request(options);
		} else {
			//@ts-ignore
			return await this.helpers.requestOAuth2.call(this, 'gmailOAuth2', options);
		}
	} catch (error) {
		if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
			error.statusCode = '401';
		}

		throw new NodeApiError(this.getNode(), error);
	}
}

export async function parseRawEmail(
	this: IExecuteFunctions,
	// tslint:disable-next-line:no-any
	messageData: any,
	dataPropertyNameDownload: string,
): Promise<INodeExecutionData> {
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
			binaryData[`${dataPropertyNameDownload}${i}`] = await this.helpers.prepareBinaryData(
				attachment.content,
				attachment.filename,
				attachment.contentType,
			);
		}
		// @ts-ignore
		responseData.attachments = undefined;
	}

	const mailBaseData: IDataObject = {};

	const resolvedModeAddProperties = ['id', 'threadId', 'labelIds', 'sizeEstimate'];

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
		from: email.from,
		to: email.to,
		cc: email.cc,
		bcc: email.bcc,
		replyTo: email.inReplyTo,
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

	const mail = new mailComposer(mailOptions).compile();

	// by default the bcc headers are deleted when the mail is built.
	// So add keepBcc flag to averride such behaviour. Only works when
	// the flag is set after the compilation.
	//https://nodemailer.com/extras/mailcomposer/#bcc
	mail.keepBcc = true;

	mailBody = await mail.build();

	return mailBody.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query);
		query.pageToken = responseData['nextPageToken'];
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (responseData['nextPageToken'] !== undefined && responseData['nextPageToken'] !== '');

	return returnData;
}

export function extractEmail(s: string) {
	const data = s.split('<')[1];
	return data.substring(0, data.length - 1);
}

function getAccessToken(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	credentials: IGoogleAuthCredentials,
): Promise<IDataObject> {
	//https://developers.google.com/identity/protocols/oauth2/service-account#httprest

	const scopes = [
		'https://www.googleapis.com/auth/gmail.labels',
		'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
		'https://www.googleapis.com/auth/gmail.addons.current.message.action',
		'https://mail.google.com/',
		'https://www.googleapis.com/auth/gmail.modify',
		'https://www.googleapis.com/auth/gmail.compose',
	];

	const now = moment().unix();

	credentials.email = credentials.email.trim();
	const privateKey = (credentials.privateKey as string).replace(/\\n/g, '\n').trim();

	const signature = jwt.sign(
		{
			iss: credentials.email as string,
			sub: credentials.delegatedEmail || (credentials.email as string),
			scope: scopes.join(' '),
			aud: `https://oauth2.googleapis.com/token`,
			iat: now,
			exp: now + 3600,
		},
		privateKey,
		{
			algorithm: 'RS256',
			header: {
				kid: privateKey,
				typ: 'JWT',
				alg: 'RS256',
			},
		},
	);

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: signature,
		},
		uri: 'https://oauth2.googleapis.com/token',
		json: true,
	};

	//@ts-ignore
	return this.helpers.request(options);
}
