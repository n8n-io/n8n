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
		uri: `https://vendors.paddle.com/api${endpoint}` ,
		body,
		json: true
	};

	body.vendor_id = credentials.vendorId;
	body.vendor_auth_code = credentials.vendorAuthCode;

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		console.log(error);
		throw new Error(error);
	}
}
