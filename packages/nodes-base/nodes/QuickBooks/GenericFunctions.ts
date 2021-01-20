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
 * Make an authenticated API request to QuickBooks.
 */
export async function quickBooksApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
): Promise<any> { // tslint:disable-line:no-any

	const productionUrl = 'https://quickbooks.api.intuit.com';
	const sandboxUrl = 'https://sandbox-quickbooks.api.intuit.com';

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
		},
		method,
		uri: `${sandboxUrl}${endpoint}`,
		qs,
		body,
		json: true,
	};

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	if (resource === 'customer' && operation === 'search') {
		options.headers!['Content-Type'] = 'text/plain';
	}

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		console.log(options);
		return await this.helpers.requestOAuth2.call(this, 'quickBooksOAuth2Api', options);
	} catch (error) {
		// console.log(error);
		throw error;
	}
}

/**
 * Make an authenticated API request to QuickBooks and return all results.
 */
export async function quickBooksApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
): Promise<any> { // tslint:disable-line:no-any

	let responseData;
	const returnData: IDataObject[] = [];

	do {
		responseData = await quickBooksApiRequest.call(this, method, endpoint, qs, body);
		qs.after = responseData.after;
		responseData.data.children.forEach((child: any) => returnData.push(child.data)); // tslint:disable-line:no-any

		if (qs.limit && returnData.length >= qs.limit) {
			return returnData;
		}

	} while (responseData.after);

	return returnData;
}

/**
 * Handles a large QuickBooks listing by returning all items or up to a limit.
 */
export async function handleListing(
	this: IExecuteFunctions,
	i: number,
	endpoint: string,
): Promise<any> { // tslint:disable-line:no-any
	let responseData;

	const returnAll = this.getNodeParameter('returnAll', i);
	if (returnAll) {
		return await quickBooksApiRequestAllItems.call(this, 'GET', endpoint, {}, {});
	}

	const qs: IDataObject = {
		limit: this.getNodeParameter('limit', i),
	};
	responseData = await quickBooksApiRequestAllItems.call(this, 'GET', endpoint, qs, {});
	responseData = responseData.splice(0, qs.limit);

	return responseData;
}