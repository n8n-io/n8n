import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	GenericValue,
	IDataObject,
	IHttpRequestOptions,
	NodeApiError,
	NodeOperationError,
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
	const credentials = await this.getCredentials('mattermostApi');

	if (!credentials) {
		throw new NodeOperationError(this.getNode(), 'No credentials returned!');
	}

	const options: IHttpRequestOptions = {
		method,
		body,
		qs: query,
		url: `${credentials.baseUrl}/api/v4/${endpoint}`,
		headers: {
			authorization: `Bearer ${credentials.accessToken}`,
			'content-type': 'application/json; charset=utf-8',
		},
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

	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 0;
	query.per_page = 100;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		query.page++;
		returnData.push.apply(returnData, responseData);
	} while (
		responseData.length !== 0
	);

	return returnData;
}
