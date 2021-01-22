import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

import {
	pascalCase
} from 'change-case';

/**
 * Make an authenticated API request to QuickBooks.
 */
export async function quickBooksApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	option: IDataObject = {},
): Promise<any> { // tslint:disable-line:no-any

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	let isPdfEstimate = false;
	if (resource === 'estimate' && operation === 'get') {
		isPdfEstimate = this.getNodeParameter('download', 0) as boolean;
	}

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
		json: !isPdfEstimate,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	if (isPdfEstimate) {
		options.headers!['Accept'] = 'application/pdf';
	}

	try {
		console.log(options);
		return await this.helpers.requestOAuth2!.call(this, 'quickBooksOAuth2Api', options);
	} catch (error) {
		throw error;
	}
}

/**
 * Make an authenticated API request to QuickBooks and return all results.
 */
export async function quickBooksApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	resource: string,
	limit?: number,
): Promise<any> { // tslint:disable-line:no-any

	let responseData;
	let startPosition = 1;
	const returnData: IDataObject[] = [];

	do {
		qs.query += ` MAXRESULTS 1000 STARTPOSITION ${startPosition}`;
		responseData = await quickBooksApiRequest.call(this, method, endpoint, qs, body);
		returnData.push(...responseData.QueryResponse[pascalCase(resource)]);

		if (limit && returnData.length >= limit) {
			return returnData;
		}

		startPosition = responseData.maxResults + 1;

	} while (responseData.maxResults > returnData.length);

	return returnData;
}

/**
 * Handles a QuickBooks listing by returning all items or up to a limit.
 */
export async function handleListing(
	this: IExecuteFunctions,
	i: number,
	endpoint: string,
	resource: string,
): Promise<any> { // tslint:disable-line:no-any
	let responseData;

	const qs = {
		query: `SELECT * FROM ${resource}`,
	} as IDataObject;

	const filters = this.getNodeParameter('filters', i) as IDataObject;
	if (filters.query) {
		qs.query += ` ${filters.query}`;
	}

	const returnAll = this.getNodeParameter('returnAll', i);

	if (returnAll) {
		responseData = await quickBooksApiRequestAllItems.call(this, 'GET', endpoint, qs, {}, resource);
	} else {
		const limit = this.getNodeParameter('limit', i) as number;
		responseData = await quickBooksApiRequestAllItems.call(this, 'GET', endpoint, qs, {}, resource, limit);
		responseData = responseData.splice(0, limit);
	}

	return responseData;
}

export async function getSyncToken(this: IExecuteFunctions, i: number, companyId: string, resource: string) {
	const resourceId = this.getNodeParameter(`${resource}Id`, i);
	const getEndpoint = `/v3/company/${companyId}/${resource}/${resourceId}`;
	const propertyName = pascalCase(resource);
	const { [propertyName]: { SyncToken } } = await quickBooksApiRequest.call(this, 'GET', getEndpoint, {}, {});
	return SyncToken;
}