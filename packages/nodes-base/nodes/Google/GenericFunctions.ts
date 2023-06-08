import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';
import type { ICredentialTestFunctions, IDataObject, IPollFunctions } from 'n8n-workflow';

import type { OptionsWithUri } from 'request';
import moment from 'moment-timezone';
import * as jwt from 'jsonwebtoken';

const googleServiceAccountScopes = {
	bigquery: ['https://www.googleapis.com/auth/bigquery'],
	books: ['https://www.googleapis.com/auth/books'],
	chat: ['https://www.googleapis.com/auth/chat.bot'],
	docs: [
		'https://www.googleapis.com/auth/documents',
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.file',
	],
	drive: [
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.appdata',
		'https://www.googleapis.com/auth/drive.photos.readonly',
	],
	gmail: [
		'https://www.googleapis.com/auth/gmail.labels',
		'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
		'https://www.googleapis.com/auth/gmail.addons.current.message.action',
		'https://mail.google.com/',
		'https://www.googleapis.com/auth/gmail.modify',
		'https://www.googleapis.com/auth/gmail.compose',
	],
	sheetV1: [
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/spreadsheets',
	],
	sheetV2: [
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/spreadsheets',
		'https://www.googleapis.com/auth/drive.metadata',
	],
	slides: [
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/presentations',
	],
	translate: [
		'https://www.googleapis.com/auth/cloud-translation',
		'https://www.googleapis.com/auth/cloud-platform',
	],
};

type GoogleServiceAccount = keyof typeof googleServiceAccountScopes;

export async function getGoogleAccessToken(
	this:
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| ICredentialTestFunctions
		| IPollFunctions,
	credentials: IDataObject,
	service: GoogleServiceAccount,
): Promise<IDataObject> {
	//https://developers.google.com/identity/protocols/oauth2/service-account#httprest

	const scopes = googleServiceAccountScopes[service];

	const privateKey = (credentials.privateKey as string).replace(/\\n/g, '\n').trim();
	credentials.email = ((credentials.email as string) || '').trim();

	const now = moment().unix();

	const signature = jwt.sign(
		{
			iss: credentials.email,
			sub: credentials.delegatedEmail || credentials.email,
			scope: scopes.join(' '),
			aud: 'https://oauth2.googleapis.com/token',
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

	return this.helpers.request(options);
}
