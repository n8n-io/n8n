import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
	IWebhookFunctions,
	BINARY_ENCODING
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function paddleApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, endpoint: string, method: string, body: any = {}, query?: IDataObject, uri?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('paddleApi');

	if (credentials === undefined) {
		throw new Error('Could not retrieve credentials!');
	}

	const options : OptionsWithUri = {
		method,
		headers: {
			'content-type': 'application/json'
		},
		uri: `https://vendors.paddle.com/api${endpoint}` ,
		body,
		json: true
	};

	body['vendor_id'] = credentials.vendorId;
	body['vendor_auth_code'] = credentials.vendorAuthCode;

	console.log(options.body);
	console.log(options);

	try {
		const response = await this.helpers.request!(options);
		console.log(response);

		if (!response.success) {
			throw new Error(`Code: ${response.error.code}. Message: ${response.error.message}`);
		}

		return response.response;
	} catch (error) {
		console.log(error);
		throw new Error(error);
	}
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
