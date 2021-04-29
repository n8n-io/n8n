import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export async function webflowApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	let options: OptionsWithUri = {
		headers: {
			'accept-version': '1.0.0',
		},
		method,
		qs,
		body,
		uri: uri || `https://api.webflow.com${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);

	if (Object.keys(options.qs).length === 0) {
		delete options.qs;
	}

	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = await this.getCredentials('webflowApi');
			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}

			options.headers!['authorization'] = `Bearer ${credentials.accessToken}`;

			return await this.helpers.request!(options);
		} else {
			return await this.helpers.requestOAuth2!.call(this, 'webflowOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function webflowApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {

	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = 100;
	query.offset = 0;

	do {
		responseData = await webflowApiRequest.call(this, method, endpoint, body, query);
		if (responseData.offset !== undefined) {
			query.offset += query.limit;
		}
		returnData.push.apply(returnData, responseData.items);
	} while (
		returnData.length < responseData.total
	);

	return returnData;
}

