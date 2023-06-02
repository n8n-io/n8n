import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';
import type { ICredentialTestFunctions, IDataObject, IPollFunctions } from 'n8n-workflow';

import type { OptionsWithUri } from 'request';
import moment from 'moment-timezone';
import * as jwt from 'jsonwebtoken';

export async function getGoogleAccessToken(
	this:
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| ICredentialTestFunctions
		| IPollFunctions,
	credentials: IDataObject,
	scopes: string[],
): Promise<IDataObject> {
	//https://developers.google.com/identity/protocols/oauth2/service-account#httprest

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
