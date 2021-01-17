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
 * Make an API request to Reddit.
 */
export async function redditApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	noAuth: boolean,
): Promise<any> { // tslint:disable-line:no-any

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
		},
		method,
		uri: noAuth ? `https://www.reddit.com/${endpoint}` : `https://oauth.reddit.com/api/v1/${endpoint}`,
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
		return noAuth
			? await this.helpers.request.call(this, options)
			: await this.helpers.requestOAuth2.call(this, 'redditOAuth2Api', options);
	} catch (error) {
		if (error.message) {
			const errorObject = JSON.parse(error.message.match(/{.*}/)[0]);
			throw new Error(`Reddit error response [${errorObject.error}]: ${errorObject.message}`);
		}
		throw error;
	}
}


/**
 * Make an API request to Reddit and return all results.
 */
export async function redditApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	noAuth: boolean,
): Promise<any> { // tslint:disable-line:no-any

	let responseData;
	const returnData: IDataObject[] = [];

	do {
		responseData = await redditApiRequest.call(this, method, endpoint, qs, body, noAuth);
		qs.after = responseData.after;
		responseData.data.children.forEach((child: any) => returnData.push(child.data)); // tslint:disable-line:no-any

		if (qs.limit && returnData.length >= qs.limit) {
			return returnData;
		}

	} while (responseData.after);

	return returnData;
}
