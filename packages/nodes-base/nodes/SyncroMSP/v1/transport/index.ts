import { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-core';

import {
	GenericValue,
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	IHttpRequestOptions,
	NodeApiError,
} from 'n8n-workflow';

/**
 * Make an API request to Mattermost
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD',
	endpoint: string,
	body: IDataObject | GenericValue | GenericValue[] = {},
	query: IDataObject = {},
) {
	const credentials = await this.getCredentials('syncroMspApi');

	query.api_key = credentials.apiKey;

	const options: IHttpRequestOptions = {
		method,
		body,
		qs: query,
		url: `https://${credentials.subdomain}.syncromsp.com/api/v1/${endpoint}`,
		headers: {},
	};

	try {
		return await this.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function apiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD',
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {
	let returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		query.page++;
		returnData = returnData.concat(responseData[endpoint]);
	} while (responseData[endpoint].length !== 0);
	return returnData;
}

export async function validateCredentials(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
): Promise<any> {
	const credentials = decryptedCredentials;

	const { subdomain, apiKey } = credentials as {
		subdomain: string;
		apiKey: string;
	};

	const options: IHttpRequestOptions = {
		method: 'GET',
		qs: {
			api_key: apiKey,
		},
		url: `https://${subdomain}.syncromsp.com/api/v1//me`,
	};

	return this.helpers.request(options);
}
