import { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { OptionsWithUri } from 'request';

import { IDataObject, IPollFunctions, NodeApiError } from 'n8n-workflow';

/**
 * Make an API request to Airtable
 *
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('stackbyApi');

	const options: OptionsWithUri = {
		headers: {
			'api-key': credentials.apiKey,
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs: query,
		uri: uri || `https://stackby.com/api/betav1${endpoint}`,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		return this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Make an API request to paginated Airtable endpoint
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function apiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | IPollFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<any> {
	query.maxrecord = 100;

	query.offset = 0;

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData);
		query.offset += query.maxrecord;
	} while (responseData.length !== 0);

	return returnData;
}

export interface IRecord {
	field: {
		[key: string]: string;
	};
}
