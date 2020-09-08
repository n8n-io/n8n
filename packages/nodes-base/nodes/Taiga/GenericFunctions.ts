import {
	OptionsWithUri,
 } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	IDataObject,
 } from 'n8n-workflow';

export async function getAuthorization(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	credentials?: ICredentialDataDecryptedObject,
): Promise<string> {
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const { password, username } = credentials;
	const options: OptionsWithUri = {
		headers: { 'Content-Type': 'application/json' },
		method: 'POST',
		body: {
			type: 'normal',
			password,
			username,
		},
		uri: (credentials.domain) ? `http://${credentials.domain}/api/v1/auth` : 'https://api.taiga.io/api/v1/auth',
		json: true,
	};

	try {
		const response = await this.helpers.request!(options);

		return response.auth_token;
	} catch (error) {
		throw new Error('Taiga Error: ' + error.err || error);
	}
}

export async function taigaApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: string,
	resource: string,
	body = {},
	query = {},
	uri?: string | undefined,
	option = {},
): Promise<any> { // tslint:disable-line:no-any

	const version = this.getNodeParameter('version', 0, 'cloud') as string;

	let credentials;

	if (version === 'server') {
		credentials = this.getCredentials('taigaServerApi') as ICredentialDataDecryptedObject;
	} else {
		credentials = this.getCredentials('taigaCloudApi') as ICredentialDataDecryptedObject;
	}

	const authToken = await getAuthorization.call(this, credentials);

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		auth: {
			bearer: authToken,
		},
		qs: query,
		method,
		body,
		uri: uri || (credentials.domain) ? `http://${credentials.domain}/api/v1${resource}` : `https://api.taiga.io/api/v1${resource}`,
		json: true
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		let errorMessage = error;
		if (error.response.body && error.response.body._error_message) {
			errorMessage = error.response.body._error_message;

			// when project slug is not correct currently the API responds with invalid permitions
			// so make the message more clear
			if (errorMessage === 'You do not have permission to perform this action.' &&
				(method === 'GET' || method === 'POST') && resource === '/resolver') {
					errorMessage = 'Invalid project slug';
			}
		}

		throw new Error(`Taigan error response [${error.statusCode}]: ${errorMessage}`);
	}
}

export async function taigaApiRequestAllItems(this: IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	let uri: string | undefined;

	do {
		responseData = await taigaApiRequest.call(this, method, resource, body, query, uri, { resolveWithFullResponse: true });
		returnData.push.apply(returnData, responseData.body);
		uri = responseData.headers['x-pagination-next'];
		if (query.limit && returnData.length >= query.limit) {
			return returnData;
		}
	} while (
		responseData.headers['x-pagination-next'] !== undefined &&
		responseData.headers['x-pagination-next'] !== ''
	);
	return returnData;
}
