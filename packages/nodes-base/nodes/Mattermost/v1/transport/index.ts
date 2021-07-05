import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

/**
 * Make an API request to Mattermost
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: object = {},
	qs: IDataObject = {},
) {
	const credentials = this.getCredentials('mattermostApi');

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials returned!');
	}

	const options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: `${credentials.baseUrl}/api/v4/${endpoint}`,
		headers: {
			Authorization: `Bearer ${credentials.accessToken}`,
			'content-type': 'application/json; charset=utf-8',
		},
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function apiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
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
