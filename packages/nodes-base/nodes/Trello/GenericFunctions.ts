import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, IHttpRequestMethods, IHttpRequestOptions, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

/**
 * Make an API request to Trello
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	query = query || {};
	const methodPlaceholder = method as IHttpRequestMethods;
	const options: IHttpRequestOptions = {
		headers: {
		},
		qs: query,
		method: methodPlaceholder,
		body,
		url: `https://api.trello.com/1/${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'trelloApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function apiRequestAllItems(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: IDataObject, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

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
	} while (
		query.limit <= responseData.length
	);

	return returnData;
}
