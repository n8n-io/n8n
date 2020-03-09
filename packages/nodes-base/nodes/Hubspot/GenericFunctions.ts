import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function hubspotApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}, uri?: string): Promise<any> { // tslint:disable-line:no-any
	let credentials;
	try {
		credentials = this.getCredentials('hubspotApi');
	} catch (exception) {
		credentials = this.getCredentials('hubspotDeveloperApi');
	}
	query!.hapikey = credentials!.apiKey as string;
	const options: OptionsWithUri = {
		method,
		qs: query,
		uri: uri || `https://api.hubapi.com${endpoint}`,
		body,
		json: true,
		useQuerystring: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		console.log(error)
		const errorMessage = error.response.body.message || error.response.body.Message;

		if (errorMessage !== undefined) {
			throw errorMessage;
		}
		throw error.response.body;
	}
}



/**
 * Make an API request to paginated hubspot endpoint
 * and return all results
 */
export async function hubspotApiRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = 250;
	query.count = 100;

	do {
		responseData = await hubspotApiRequest.call(this, method, endpoint, body, query);
		query.offset = responseData.offset;
		query['vid-offset'] = responseData['vid-offset'];
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData['has-more'] !== undefined &&
		responseData['has-more'] !== null &&
		responseData['has-more'] !== false
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
