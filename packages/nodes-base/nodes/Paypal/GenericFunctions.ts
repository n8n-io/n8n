import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
	BINARY_ENCODING
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function paypalApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, endpoint: string, method: string, body: any = {}, query?: IDataObject, uri?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('paypalApi');
	let tokenInfo;
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	// @ts-ignore
	const env = {
		'sanbox': 'https://api.sandbox.paypal.com',
		'live': 'https://api.paypal.com'
	}[credentials.env as string];

	const data = new Buffer(`${credentials.clientId}:${credentials.secret}`).toString(BINARY_ENCODING);
	let headerWithAuthentication = Object.assign({},
		{ Authorization: `Basic ${data}`, 'Content-Type': 'application/x-www-form-urlencoded' });
		let options: OptionsWithUri = {
			headers: headerWithAuthentication,
			method,
			qs: query,
			uri: `${env}/v1/oauth2/token`,
			body,
			json: true
		};
	try {
		tokenInfo = await this.helpers.request!(options);
	} catch (error) {
		const errorMessage = error.response.body.message || error.response.body.Message;

		if (errorMessage !== undefined) {
			throw errorMessage;
		}
		throw error.response.body;
	}
	headerWithAuthentication = Object.assign({ },
		{ Authorization: `Bearer ${tokenInfo.access_token}`, 'Content-Type': 'application/json' });

	options = {
		headers: headerWithAuthentication,
		method,
		qs: query,
		uri: uri || `${env}/v1${endpoint}`,
		body,
		json: true
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		const errorMessage = error.response.body.message || error.response.body.Message;

		if (errorMessage !== undefined) {
			throw errorMessage;
		}
		throw error.response.body;
	}
}



/**
 * Make an API request to paginated intercom endpoint
 * and return all results
 */
export async function intercomApiRequestAllItems(this: IHookFunctions | IExecuteFunctions, propertyName: string, endpoint: string, method: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 60;

	let uri: string | undefined;

	do {
		responseData = await paypalApiRequest.call(this, endpoint, method, body, query, uri);
		uri = responseData.pages.next;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.pages !== undefined &&
		responseData.pages.next !== undefined &&
		responseData.pages.next !== null
	);

	return returnData;
}


export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = '';
	}
	return result;
}
