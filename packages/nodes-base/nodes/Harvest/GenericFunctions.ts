import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

export async function harvestApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	qs: IDataObject,
	path: string,
	body: IDataObject = {},
	option: IDataObject = {},
	uri?: string,
): Promise<any> {
	let options: OptionsWithUri = {
		headers: {
			'Harvest-Account-Id': `${this.getNodeParameter('accountId', 0)}`,
			'User-Agent': 'Harvest App',
			Authorization: '',
		},
		method,
		body,
		uri: uri || `https://api.harvestapp.com/v2/${path}`,
		qs,
		json: true,
	};

	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = await this.getCredentials('harvestApi');

			//@ts-ignore
			options.headers.Authorization = `Bearer ${credentials.accessToken}`;

			return await this.helpers.request(options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'harvestOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function harvestApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	qs: IDataObject,
	uri: string,
	resource: string,
	body: IDataObject = {},
	option: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await harvestApiRequest.call(this, method, qs, uri, body, option);
		qs.page = responseData.next_page;
		returnData.push.apply(returnData, responseData[resource]);
	} while (responseData.next_page);

	return returnData;
}

/**
 * fetch All resource using paginated calls
 */
export async function getAllResource(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	resource: string,
	i: number,
) {
	const endpoint = resource;
	const qs: IDataObject = {};
	const requestMethod = 'GET';

	qs.per_page = 100;

	const additionalFields = this.getNodeParameter('filters', i);
	const returnAll = this.getNodeParameter('returnAll', i);

	Object.assign(qs, additionalFields);

	let responseData: IDataObject = {};
	if (returnAll) {
		responseData[resource] = await harvestApiRequestAllItems.call(
			this,
			requestMethod,
			qs,
			endpoint,
			resource,
		);
	} else {
		const limit = this.getNodeParameter('limit', i);
		qs.per_page = limit;
		responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
	}
	return responseData[resource] as IDataObject[];
}
