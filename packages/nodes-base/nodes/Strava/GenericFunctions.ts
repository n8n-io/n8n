import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

export async function stravaApiRequest(
	this:
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IHookFunctions
		| IWebhookFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const options: OptionsWithUri = {
		method,
		form: body,
		qs,
		uri: uri ?? `https://www.strava.com/api/v3${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		if (this.getNode().type.includes('Trigger') && resource.includes('/push_subscriptions')) {
			const credentials = await this.getCredentials('stravaOAuth2Api');
			if (method === 'GET') {
				qs.client_id = credentials.clientId;
				qs.client_secret = credentials.clientSecret;
			} else {
				body.client_id = credentials.clientId;
				body.client_secret = credentials.clientSecret;
			}
			//@ts-ignore
			return await this.helpers?.request(options);
		} else {
			//@ts-ignore
			return await this.helpers.requestOAuth2.call(this, 'stravaOAuth2Api', options, {
				includeCredentialsOnRefreshOnBody: true,
			});
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function stravaApiRequestAllItems(
	this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions,
	method: string,
	resource: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 30;

	query.page = 1;

	do {
		responseData = await stravaApiRequest.call(this, method, resource, body, query);
		query.page++;
		returnData.push.apply(returnData, responseData);
	} while (responseData.length !== 0);

	return returnData;
}
