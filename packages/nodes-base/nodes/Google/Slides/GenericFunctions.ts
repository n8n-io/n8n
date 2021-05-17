import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
} from 'n8n-workflow';

import * as moment from 'moment-timezone';

import * as jwt from 'jsonwebtoken';

export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'serviceAccount') as string;
	const options: OptionsWithUri & { headers: IDataObject } = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: `https://slides.googleapis.com/v1${resource}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		if (authenticationMethod === 'serviceAccount') {
			const credentials = await this.getCredentials('googleApi') as { access_token: string, email: string, privateKey: string };
			const { access_token } = await getAccessToken.call(this, credentials);
			options.headers.Authorization = `Bearer ${access_token}`;
			return await this.helpers.request!(options);

		} else {
			return await this.helpers.requestOAuth2!.call(this, 'googleSlidesOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

function getAccessToken(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	{ email, privateKey }: { email: string, privateKey: string },
) {
	// https://developers.google.com/identity/protocols/oauth2/service-account#httprest

	const scopes = [
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/presentations',
	];

	const now = moment().unix();

	const signature = jwt.sign(
		{
			iss: email,
			sub: email,
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

	return this.helpers.request!(options);
}
