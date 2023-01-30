import type { OptionsWithUri } from 'request';
import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';
import type { ICredentialTestFunctions, IDataObject, IPollFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import moment from 'moment-timezone';
import jwt from 'jsonwebtoken';

export interface IGoogleAuthCredentials {
	delegatedEmail?: string;
	email: string;
	inpersonate: boolean;
	privateKey: string;
}

export async function getAccessToken(
	this:
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| ICredentialTestFunctions
		| IPollFunctions,
	credentials: IGoogleAuthCredentials,
): Promise<IDataObject> {
	//https://developers.google.com/identity/protocols/oauth2/service-account#httprest

	const scopes = [
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/spreadsheets',
		'https://www.googleapis.com/auth/drive.metadata',
	];

	const now = moment().unix();

	credentials.email = credentials.email.trim();
	const privateKey = credentials.privateKey.replace(/\\n/g, '\n').trim();

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

export async function apiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
	option: IDataObject = {},
) {
	const authenticationMethod = this.getNodeParameter(
		'authentication',
		0,
		'serviceAccount',
	) as string;
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://sheets.googleapis.com${resource}`,
		json: true,
		...option,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
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

			return await this.helpers.request(options);
		} else if (authenticationMethod === 'triggerOAuth2') {
			return await this.helpers.requestOAuth2.call(this, 'googleSheetsTriggerOAuth2Api', options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'googleSheetsOAuth2Api', options);
		}
	} catch (error) {
		if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
			error.statusCode = '401';
		}

		if (error.message.includes('PERMISSION_DENIED')) {
			const message = 'Missing permissions for Google Sheet';
			const description =
				"Please check that the account you're using has the right permissions. (If you're trying to modify the sheet, you'll need edit access.)";
			throw new NodeApiError(this.getNode(), error, { message, description });
		}

		throw new NodeApiError(this.getNode(), error);
	}
}

export async function apiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	uri?: string,
) {
	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;
	const url = uri ? uri : `https://sheets.googleapis.com${method}`;
	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query, url);
		query.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}
