import type { IExecuteFunctions, IHookFunctions, IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { OptionsWithUri } from 'request';

/**
 * Make an authenticated or unauthenticated API request to Reddit.
 */
export async function redditApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
): Promise<any> {
	const resource = this.getNodeParameter('resource', 0) as string;

	const authRequired = ['profile', 'post', 'postComment'].includes(resource);

	qs.api_type = 'json';

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
		},
		method,
		uri: authRequired
			? `https://oauth.reddit.com/${endpoint}`
			: `https://www.reddit.com/${endpoint}`,
		qs,
		json: true,
	};

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	if (authRequired) {
		try {
			return await this.helpers.requestOAuth2.call(this, 'redditOAuth2Api', options);
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	} else {
		try {
			return await this.helpers.request.call(this, options);
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}
}

/**
 * Make an unauthenticated API request to Reddit and return all results.
 */
export async function redditApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
): Promise<any> {
	let responseData;
	const returnData: IDataObject[] = [];

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	const returnAll = this.getNodeParameter('returnAll', 0, false) as boolean;

	qs.limit = 100;

	do {
		responseData = await redditApiRequest.call(this, method, endpoint, qs);
		if (!Array.isArray(responseData)) {
			qs.after = responseData.data.after;
		}

		if (endpoint === 'api/search_subreddits.json') {
			responseData.subreddits.forEach((child: any) => returnData.push(child as IDataObject));
		} else if (resource === 'postComment' && operation === 'getAll') {
			responseData[1].data.children.forEach((child: any) =>
				returnData.push(child.data as IDataObject),
			);
		} else {
			responseData.data.children.forEach((child: any) =>
				returnData.push(child.data as IDataObject),
			);
		}
		if (qs.limit && returnData.length >= qs.limit && !returnAll) {
			return returnData;
		}
	} while (responseData.data?.after);

	return returnData;
}

/**
 * Handles a large Reddit listing by returning all items or up to a limit.
 */
export async function handleListing(
	this: IExecuteFunctions,
	i: number,
	endpoint: string,
	qs: IDataObject = {},
	requestMethod: 'GET' | 'POST' = 'GET',
): Promise<any> {
	let responseData;

	const returnAll = this.getNodeParameter('returnAll', i);

	if (returnAll) {
		responseData = await redditApiRequestAllItems.call(this, requestMethod, endpoint, qs);
	} else {
		const limit = this.getNodeParameter('limit', i);
		qs.limit = limit;
		responseData = await redditApiRequestAllItems.call(this, requestMethod, endpoint, qs);
		responseData = responseData.slice(0, limit);
	}

	return responseData;
}
