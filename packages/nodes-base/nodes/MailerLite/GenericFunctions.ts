import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

export async function mailerliteApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string,
	path: string,

	body: any = {},
	qs: IDataObject = {},
	_option = {},
): Promise<any> {
	const credentials = await this.getCredentials('mailerLiteApi');

	const options: OptionsWithUri = {
		headers: {
			'X-MailerLite-ApiKey': credentials.apiKey,
		},
		method,
		body,
		qs,
		uri: `https://api.mailerlite.com/api/v2${path}`,
		json: true,
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function mailerliteApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = 1000;
	query.offset = 0;

	do {
		responseData = await mailerliteApiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData);
		query.offset = query.offset + query.limit;
	} while (responseData.length !== 0);
	return returnData;
}
