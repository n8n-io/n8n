import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function apiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, qs: IDataObject = {}, uri?: string, headers: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://googleads.googleapis.com/v9/${endpoint}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'googleAdsOAuth2Api', options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errors = error.response.body.error.errors;

			errors = errors.map((e: IDataObject) => e.message);
			// Try to return the error prettier
			throw new Error(
				`Google Ads error response [${error.statusCode}]: ${errors.join('|')}`,
			);
		}
		throw error;
	}
}
export async function apiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD',
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {

	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 0;
	query.per_page = 100;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		query.page++;
		returnData.push.apply(returnData, responseData);
	} while (
		responseData.length !== 0
	);

	return returnData;
}
