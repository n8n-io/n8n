import {
	OptionsWithUri,
 } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
 } from 'n8n-workflow';

export async function zendeskApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('zendeskApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const base64Key =  Buffer.from(`${credentials.email}/token:${credentials.apiToken}`).toString('base64');
	let options: OptionsWithUri = {
		headers: { 'Authorization': `Basic ${base64Key}`},
		method,
		qs,
		body,
		uri: uri ||`${credentials.url}/api/v2${resource}.json`,
		json: true
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (err) {
		let errorMessage = err.message;
		if (err.response && err.response.body && err.response.body.error) {
			errorMessage = err.response.body.error;
			if (typeof err.response.body.error !== 'string') {
				errorMessage = JSON.stringify(errorMessage);
			}
		}

		throw new Error(`Zendesk error response [${err.statusCode}]: ${errorMessage}`);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function zendeskApiRequestAllItems(this: IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions, propertyName: string, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	let uri: string | undefined;

	do {
		responseData = await zendeskApiRequest.call(this, method, resource, body, query, uri);
		uri = responseData.next_page;
		returnData.push.apply(returnData, responseData[propertyName]);
		if (query.limit && query.limit <= returnData.length) {
			return returnData;
		}
	} while (
		responseData.next_page !== undefined &&
		responseData.next_page !== null
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
