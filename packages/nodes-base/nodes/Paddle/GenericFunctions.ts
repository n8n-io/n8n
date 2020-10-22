import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function paddleApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, endpoint: string, method: string, body: any = {}, query?: IDataObject, uri?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('paddleApi');

	if (credentials === undefined) {
		throw new Error('Could not retrieve credentials!');
	}

	const options: OptionsWithUri = {
		method,
		headers: {
			'content-type': 'application/json',
		},
		uri: `https://vendors.paddle.com/api${endpoint}`,
		body,
		json: true,
	};

	body['vendor_id'] = credentials.vendorId;
	body['vendor_auth_code'] = credentials.vendorAuthCode;
	try {
		const response = await this.helpers.request!(options);

		if (!response.success) {
			throw new Error(`Code: ${response.error.code}. Message: ${response.error.message}`);
		}

		return response;
	} catch (error) {
		throw new Error(`ERROR: Code: ${error.code}. Message: ${error.message}`);
	}
}

export async function paddleApiRequestAllItems(this: IHookFunctions | IExecuteFunctions, propertyName: string, endpoint: string, method: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	body.results_per_page = 200;
	body.page = 1;

	do {
		responseData = await paddleApiRequest.call(this, endpoint, method, body, query);
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData[propertyName].length !== 0
	);

	return returnData;
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
