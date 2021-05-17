import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

import * as moment from 'moment-timezone';

import * as jwt from 'jsonwebtoken';

export async function googleApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'serviceAccount') as string;

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://www.googleapis.com${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		if (authenticationMethod === 'serviceAccount') {
			const credentials = await this.getCredentials('googleApi');

			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}

			const { access_token } = await getAccessToken.call(this, credentials as IDataObject);

			options.headers!.Authorization = `Bearer ${access_token}`;
			return await this.helpers.request!(options);
		} else {
			//@ts-ignore
			return await this.helpers.requestOAuth2.call(this, 'googleDriveOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function googleApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;
	query.pageSize = 100;

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

function getAccessToken(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, credentials: IDataObject): Promise<IDataObject> {
	//https://developers.google.com/identity/protocols/oauth2/service-account#httprest

	const scopes = [
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.appdata',
		'https://www.googleapis.com/auth/drive.photos.readonly',
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

	return this.helpers.request!(options);
}
