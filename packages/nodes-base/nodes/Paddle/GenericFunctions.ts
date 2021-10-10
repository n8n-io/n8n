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
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

export async function paddleApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, endpoint: string, method: string, body: any = {}, query?: IDataObject, uri?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('paddleApi');
	const productionUrl = 'https://vendors.paddle.com/api';
	const sandboxUrl = 'https://sandbox-vendors.paddle.com/api';

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'Could not retrieve credentials!');
	}

	const isSandbox = credentials.sandbox;

	const options: OptionsWithUri = {
		method,
		headers: {
			'content-type': 'application/json',
		},
		uri: `${isSandbox === true ? sandboxUrl : productionUrl}${endpoint}`,
		body,
		json: true,
	};

	body['vendor_id'] = credentials.vendorId;
	body['vendor_auth_code'] = credentials.vendorAuthCode;
	try {
		const response = await this.helpers.request!(options);

		if (!response.success) {
			throw new NodeApiError(this.getNode(), response);
		}

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
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
		body.page++;
	} while (
		responseData[propertyName].length !== 0 && responseData[propertyName].length === body.results_per_page
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
