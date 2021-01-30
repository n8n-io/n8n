import {
	OptionsWithUri,
	OptionsWithUrl,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import * as moment from 'moment-timezone';

import * as jwt from 'jsonwebtoken';

export async function googleApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, projectId: string, method: string, resource: string, body: any = {}, qs: IDataObject = {}, headers: IDataObject = {}, uri: string | null = null): Promise<any> { // tslint:disable-line:no-any
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'serviceAccount') as string;

	const options: OptionsWithUrl = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		url: uri || `https://${projectId}.firebaseio.com/${resource}.json`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		if (authenticationMethod === 'serviceAccount') {
			const credentials = this.getCredentials('googleFirebaseApi');

			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			const { access_token } = await getAccessToken.call(this, credentials as IDataObject);

			options.headers!.Authorization = `Bearer ${access_token}`;
			//@ts-ignore
			return await this.helpers.request(options);
		} else {
			//@ts-ignore
			return await this.helpers.requestOAuth2.call(this, 'googleFirebaseRealtimeDatabaseOAuth2Api', options);
		}
	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errors;

			if (error.response.body.error.errors) {

				errors = error.response.body.error.errors;

				errors = errors.map((e: IDataObject) => e.message).join('|');

			} else {
				errors = error.response.body.error.message;
			}

			// Try to return the error prettier
			throw new Error(
				`Google Firebase error response [${error.statusCode}]: ${errors}`,
			);
		}
		throw error;
	}
}


export async function googleApiRequestAllItems(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, projectId: string, method: string, resource: string, body: any = {}, qs: IDataObject = {}, headers: IDataObject = {}, uri: string | null = null): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	qs.pageSize = 100;

	do {
		responseData = await googleApiRequest.call(this, projectId, method, resource, body, qs, {}, uri);
		qs.pageToken = responseData['nextPageToken'];
		returnData.push.apply(returnData, responseData[resource]);
	} while (
		responseData['nextPageToken'] !== undefined &&
		responseData['nextPageToken'] !== ''
	);

	return returnData;
}

function getAccessToken(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, credentials: IDataObject): Promise<IDataObject> {
	//https://developers.google.com/identity/protocols/oauth2/service-account#httprest

	const scopes = [
		'https://www.googleapis.com/auth/userinfo.email',
		'https://www.googleapis.com/auth/firebase.database',
		'https://www.googleapis.com/auth/firebase',
	];

	const now = moment().unix();

	const signature = jwt.sign(
		{
			'iss': credentials.email as string,
			'sub': credentials.delegatedEmail || credentials.email as string,
			'scope': scopes.join(' '),
			'aud': `https://oauth2.googleapis.com/token`,
			'iat': now,
			'exp': now + 3600,
		},
		credentials.privateKey as string,
		{
			algorithm: 'RS256',
			header: {
				'kid': credentials.privateKey as string,
				'typ': 'JWT',
				'alg': 'RS256',
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
