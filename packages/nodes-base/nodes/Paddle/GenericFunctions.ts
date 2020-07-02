import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
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

	try {
		const response = await this.helpers.request!(options);
		// Order endpoint is from V1 of API and doesn't return the same object as V2 unless error
		if (response.checkout) {
			return response;
		}

		if (!response.success) {
			throw new Error(`Code: ${response.error.code}. Message: ${response.error.message}`);
		}

		// Return only products due to changing return object structure
		if (response.response.products) {
			return response.response.products;
		}

		// Transform data display to suit table
		if (response.response.coupon_codes) {
			const couponCodes = response.response.coupon_codes;
			let newResponse = [];
			for (const code of couponCodes) {
				newResponse.push({code: code})
			}

			return newResponse;
		}

		return response.response;
	} catch (error) {
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
