import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';


async function executeApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject|IDataObject[],
	qs: IDataObject,
	uri: string,
) {
	const options: OptionsWithUri = {
		headers: {},
		method,
		body,
		qs,
		uri: `${uri}${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.requestOAuth2.call(this, 'tributechOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function trustApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject|IDataObject[] = {},
	qs: IDataObject = {},
) {
	const credentials = this.getCredentials('tributechOAuth2Api') || {};
	return executeApiRequest.call(this, method, endpoint, body, qs, credentials.trustApiEndpoint as string);
}

// export async function trustApiRequestAllItems(
// 	this: IHookFunctions | IExecuteFunctions,
// 	method: string,
// 	endpoint: string,
// 	body: IDataObject = {},
// 	queryString: IDataObject = {},
// ) {
// 	queryString.pageNumber = 1;
// 	queryString.pageSize = 2147483647;
//
// 	return trustApiRequest.call(this, method, endpoint, body, queryString);
// }
//
// export async function trustApiHandleListing(
// 	this: IExecuteFunctions,
// 	method: string,
// 	endpoint: string,
// 	body: IDataObject = {},
// 	qs: IDataObject = {},
// ) {
// 	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
//
// 	if (returnAll) {
// 		return await trustApiRequestAllItems.call(this, method, endpoint, body, qs);
// 	}
//
// 	const responseData = await trustApiRequestAllItems.call(this, method, endpoint, body, qs);
// 	const limit = this.getNodeParameter('limit', 0) as number;
//
// 	return responseData.slice(0, limit);
// }

export async function dataApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject|IDataObject[] = {},
	qs: IDataObject = {},
) {
	const credentials = this.getCredentials('tributechOAuth2Api') || {};
	return executeApiRequest.call(this, method, endpoint, body, qs, credentials.dataApiEndpoint as string);
}

// export async function dataApiRequestAllItems(
// 	this: IHookFunctions | IExecuteFunctions,
// 	method: string,
// 	endpoint: string,
// 	body: IDataObject = {},
// 	queryString: IDataObject = {},
// ) {
// 	queryString.pageNumber = 1;
// 	queryString.pageSize = 2147483647;
// 	return dataApiRequest.call(this, method, endpoint, body, queryString);
// }

// export async function dataApiHandleListing(
// 	this: IExecuteFunctions,
// 	method: string,
// 	endpoint: string,
// 	body: IDataObject = {},
// 	qs: IDataObject = {},
// ) {
// 	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
//
// 	if (returnAll) {
// 		return await dataApiRequestAllItems.call(this, method, endpoint, body, qs);
// 	}
//
// 	const responseData = await dataApiRequestAllItems.call(this, method, endpoint, body, qs);
// 	const limit = this.getNodeParameter('limit', 0) as number;
//
// 	return responseData.slice(0, limit);
// }
