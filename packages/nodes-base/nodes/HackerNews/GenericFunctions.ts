import { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import { IDataObject, ILoadOptionsFunctions, NodeApiError } from 'n8n-workflow';

import { OptionsWithUri } from 'request';

/**
 * Make an API request to HackerNews
 *
 */
export async function hackerNewsApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
): Promise<any> {
	const options: OptionsWithUri = {
		method,
		qs,
		uri: `http://hn.algolia.com/api/v1/${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Make an API request to HackerNews
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function hackerNewsApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
): Promise<any> {
	qs.hitsPerPage = 100;

	const returnData: IDataObject[] = [];

	let responseData;
	let itemsReceived = 0;

	do {
		responseData = await hackerNewsApiRequest.call(this, method, endpoint, qs);
		returnData.push.apply(returnData, responseData.hits);

		if (returnData !== undefined) {
			itemsReceived += returnData.length;
		}
	} while (responseData.nbHits > itemsReceived);

	return returnData;
}
