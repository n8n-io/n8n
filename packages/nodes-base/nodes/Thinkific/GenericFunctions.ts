import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

export async function thinkificApiRequest(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
) {
	const options: OptionsWithUri = {
		headers: {},
		body,
		method,
		qs,
		uri: uri ?? `https://api.thinkific.com/api/public/v1${endpoint}`,
		json: true,
	};

	try {
		const credentials = this.getCredentials('thinkificApi');

		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}

		if (Object.keys(headers).length) {
			Object.assign(options.headers, headers);
		}

		if (!Object.keys(body).length) {
			delete options.body;
		}

		if (!Object.keys(qs).length) {
			delete options.qs;
		}

		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function thinkificApiRequestAllItems(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const returnData: IDataObject[] = [];
	let responseData;

	do {
		responseData = await thinkificApiRequest.call(this, method, endpoint, body, qs);
		// TODO: Get next page
		returnData.push(...responseData);
	} while (
		true // TODO: Add condition for total not yet reached
	);

	return returnData;
}

export async function handleListing(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

	if (returnAll) {
		return await thinkificApiRequestAllItems.call(this, method, endpoint, body, qs);
	}

	const responseData = await thinkificApiRequestAllItems.call(this, method, endpoint, body, qs);
	const limit = this.getNodeParameter('limit', 0) as number;

	return responseData.slice(0, limit);
}
