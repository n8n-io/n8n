import {
	OptionsWithUrl,
} from 'request';

import {
	IHookFunctions,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function twitterApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IHookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	let options: OptionsWithUrl = {
		method,
		body,
		qs,
		url: uri || `https://api.twitter.com/1.1${resource}`,
		json: true
	};
	try {
		if (Object.keys(option).length !== 0) {
			options = Object.assign({}, options, option);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.requestOAuth1.call(this, 'twitterOAuth1Api', options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.errors) {
			// Try to return the error prettier
			const errorMessages = error.response.body.errors.map((error: IDataObject) => {
				return error.message;
			});
			throw new Error(`Twitter error response [${error.statusCode}]: ${errorMessages.join(' | ')}`);
		}

		throw error;
	}
}

export async function twitterApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.count = 100;

	do {
		responseData = await twitterApiRequest.call(this, method, endpoint, body, query);
		query.since_id = responseData.search_metadata.max_id;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.search_metadata &&
		responseData.search_metadata.next_results
	);

	return returnData;
}

export function chunks (buffer: Buffer, chunkSize: number) {
	const result = [];
	const len = buffer.length;
	let i = 0;

	while (i < len) {
		result.push(buffer.slice(i, i += chunkSize));
	}

	return result;
}


