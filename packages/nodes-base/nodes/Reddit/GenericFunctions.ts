import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';


/**
 * Make an authenticated or unauthenticated API request to Reddit.
 */
export async function redditApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
): Promise<any> { // tslint:disable-line:no-any

	const resource = this.getNodeParameter('resource', 0) as string;
	const authRequired = ['profile', 'post', 'postComment'].includes(resource);

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
		},
		method,
		uri: authRequired ? `https://oauth.reddit.com/${endpoint}` : `https://www.reddit.com/${endpoint}`,
		qs,
		json: true,
	};

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		console.log(options);
		return authRequired
			? await this.helpers.requestOAuth2.call(this, 'redditOAuth2Api', options)
			: await this.helpers.request.call(this, options);

	} catch (error) {
		if (error.message) {
			const errorObject = JSON.parse(error.message.match(/{.*}/)[0]);
			throw new Error(`Reddit error response [${errorObject.error}]: ${errorObject.message}`);
		}
		throw error;
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
): Promise<any> { // tslint:disable-line:no-any

	let responseData;
	const returnData: IDataObject[] = [];

	do {
		console.log(method);
		console.log(endpoint);
		console.log(qs);
		responseData = await redditApiRequest.call(this, method, endpoint, qs);
		console.log(responseData);
		qs.after = responseData.after;

		if (endpoint === 'api/search_subreddits.json') {
			responseData.subreddits.forEach((child: any) => returnData.push(child)); // tslint:disable-line:no-any
		} else {
			responseData.data.children.forEach((child: any) => returnData.push(child.data)); // tslint:disable-line:no-any
		}

		if (qs.limit && returnData.length >= qs.limit) {
			return returnData;
		}

	} while (responseData.after);

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
): Promise<any> { // tslint:disable-line:no-any

	let responseData;

	const returnAll = this.getNodeParameter('returnAll', i);

	if (returnAll) {
		responseData = await redditApiRequestAllItems.call(this, requestMethod, endpoint, qs);
	} else {
		qs.limit = this.getNodeParameter('limit', i);
		responseData = await redditApiRequestAllItems.call(this, requestMethod, endpoint, qs);
		responseData = responseData.splice(0, qs.limit);
	}

	return responseData;
}
