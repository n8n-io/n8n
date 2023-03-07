import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import type { IDataObject } from 'n8n-workflow';

export async function webflowApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken');
	let credentialsType = '';

	if (authenticationMethod === 'accessToken') {
		credentialsType = 'webflowApi';
	}

	if (authenticationMethod === 'oAuth2') {
		credentialsType = 'webflowOAuth2Api';
	}

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

	if (Object.keys(options.qs as IDataObject).length === 0) {
		delete options.qs;
	}

	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	return this.helpers.requestWithAuthentication.call(this, credentialsType, options);
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
		returnData.push.apply(returnData, responseData.items as IDataObject[]);
	} while (returnData.length < responseData.total);

	return returnData;
}
