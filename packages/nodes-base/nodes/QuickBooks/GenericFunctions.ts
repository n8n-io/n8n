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
		return await this.helpers.requestOAuth2.call(this, 'quickBooksOAuth2Api', options);
	} catch (error) {
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
	limit?: number,
): Promise<any> { // tslint:disable-line:no-any

	let responseData;
	let startPosition = 1;
	const returnData: IDataObject[] = [];

	do {
		qs.query += `MAXRESULTS 1000 STARTPOSITION ${startPosition}`;
		responseData = await quickBooksApiRequest.call(this, method, endpoint, qs, body);
		returnData.push(...responseData.QueryResponse.Customer);

		if (limit && returnData.length >= limit) {
			return returnData;
		}

		startPosition = responseData.maxResults + 1;

	} while (responseData.maxResults > returnData.length);

	return returnData;
}
