import {
	OptionsWithUri,
 } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject
} from 'n8n-workflow';

import {
	get,
} from 'lodash';

export async function hootsuiteApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://platform.hootsuite.com/v1${resource}`,
		json: true,
		useQuerystring: true,
	};
	try {
		//@ts-ignore
		return await this.helpers.requestOAuth.call(this, 'hootsuiteOAuth2Api', options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.errors) {
			// Try to return the error prettier
			let errorMessages = error.response.body.errors;

			errorMessages = errorMessages.map((errorItem: IDataObject) => errorItem.message);

			throw new Error(`Hootsuite error response [${error.statusCode}]: ${errorMessages.join('|')}`);
		}
	}
}

export async function hootsuiteApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string ,method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	query.limit = 100;

	do {
		responseData = await hootsuiteApiRequest.call(this, method, endpoint, body, query);
		query.cursor = get(responseData, 'metadata.cursor.next');
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.metadata !== undefined &&
		responseData.metadata.cursor !== undefined &&
		responseData.metadata.cursor.next !== undefined &&
		responseData.metadata.cursor.next !== null
	);

	return returnData;
}
