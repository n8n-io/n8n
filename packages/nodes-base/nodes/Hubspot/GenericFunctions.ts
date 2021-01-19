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

export async function hubspotApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}, uri?: string): Promise<any> { // tslint:disable-line:no-any

	let authenticationMethod = this.getNodeParameter('authentication', 0);

	if (this.getNode().type.includes('Trigger')) {
		authenticationMethod = 'developerApi';
	}

	const options: OptionsWithUri = {
		method,
		qs: query,
		uri: uri || `https://api.hubapi.com${endpoint}`,
		body,
		json: true,
		useQuerystring: true,
	};

	try {
		if (authenticationMethod === 'apiKey') {
			const credentials = this.getCredentials('hubspotApi');

			options.qs.hapikey = credentials!.apiKey as string;

			return await this.helpers.request!(options);
		} else if (authenticationMethod === 'developerApi') {
			const credentials = this.getCredentials('hubspotDeveloperApi');

			options.qs.hapikey = credentials!.apiKey as string;

			return await this.helpers.request!(options);
		} else {
			// @ts-ignore
			return await this.helpers.requestOAuth2!.call(this, 'hubspotOAuth2Api', options, { tokenType: 'Bearer' });
		}
	} catch (error) {
		let errorMessages;

		if (error.response && error.response.body) {

			if (error.response.body.message) {

				errorMessages = [error.response.body.message];

			} else if (error.response.body.errors) {
				// Try to return the error prettier
				errorMessages = error.response.body.errors;

				if (errorMessages[0].message) {
					// @ts-ignore
					errorMessages = errorMessages.map(errorItem => errorItem.message);
				}
			}
			throw new Error(`Hubspot error response [${error.statusCode}]: ${errorMessages.join('|')}`);
		}

		throw error;
	}
}

/**
 * Make an API request to paginated hubspot endpoint
 * and return all results
 */
export async function hubspotApiRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = query.limit || 250;
	query.count = 100;
	body.limit = body.limit || 100;

	do {
		responseData = await hubspotApiRequest.call(this, method, endpoint, body, query);
		query.offset = responseData.offset;
		query.vidOffset = responseData['vid-offset'];
		returnData.push.apply(returnData, responseData[propertyName]);
		//ticket:getAll endpoint does not support setting a limit, so return once the limit is reached
		if (query.limit && query.limit <= returnData.length && endpoint.includes('/tickets/paged')) {
			return returnData;
		}
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

export const propertyEvents = [
	'contact.propertyChange',
	'company.propertyChange',
	'deal.propertyChange',
];
