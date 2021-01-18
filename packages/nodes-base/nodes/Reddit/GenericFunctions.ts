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
	body: IDataObject,
): Promise<any> { // tslint:disable-line:no-any

	const resource = this.getNodeParameter('resource', 0) as string;
	const requiresAuth = ['myAccount', 'submission'].includes(resource);

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
		},
		method,
		uri: requiresAuth ? `https://oauth.reddit.com/api/v1/${endpoint}` : `https://www.reddit.com/${endpoint}`,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return requiresAuth
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
	body: IDataObject,
): Promise<any> { // tslint:disable-line:no-any

	let responseData;
	const returnData: IDataObject[] = [];

	do {
		responseData = await redditApiRequest.call(this, method, endpoint, qs, body);
		qs.after = responseData.after;
		responseData.data.children.forEach((child: any) => returnData.push(child.data)); // tslint:disable-line:no-any

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
): Promise<any> { // tslint:disable-line:no-any
	let responseData;

	const returnAll = this.getNodeParameter('returnAll', i);
	if (returnAll) {
		return await redditApiRequestAllItems.call(this, 'GET', endpoint, {}, {});
	}

	const qs: IDataObject = {
		limit: this.getNodeParameter('limit', i),
	};
	responseData = await redditApiRequestAllItems.call(this, 'GET', endpoint, qs, {});
	responseData = responseData.splice(0, qs.limit);

	return responseData;
}