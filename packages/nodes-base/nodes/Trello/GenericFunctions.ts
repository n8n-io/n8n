import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-core';

import type { OptionsWithUri } from 'request';

import type { IDataObject } from 'n8n-workflow';

/**
 * Make an API request to Trello
 *
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: object,
	query?: IDataObject,
): Promise<any> {
	query = query || {};

	const options: OptionsWithUri = {
		method,
		body,
		qs: query,
		uri: `https://api.trello.com/1/${endpoint}`,
		json: true,
	};

	return this.helpers.requestWithAuthentication.call(this, 'trelloApi', options);
}

export async function apiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	query: IDataObject = {},
): Promise<any> {
	query.limit = 30;

	query.sort = '-id';

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData);
		if (responseData.length !== 0) {
			query.before = responseData[responseData.length - 1].id;
		}
	} while (query.limit <= responseData.length);

	return returnData;
}
