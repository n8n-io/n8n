import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function gotifyApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, path: string, body: any = {}, qs: IDataObject = {}, uri?: string | undefined, option = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('gotifyApi') as IDataObject;

	const options: OptionsWithUri = {
		method,
		headers: {
			'X-Gotify-Key': (method === 'POST') ? credentials.appApiToken : credentials.clientApiToken,
			accept: 'application/json',
		},
		body,
		qs,
		uri: uri || `${credentials.url}${path}`,
		json: true,
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {

		if (error.response && error.response.body && error.response.body.errorDescription) {
			const message = error.response.body.errorDescription;
			// Try to return the error prettier
			throw new Error(
				`Gotify error response [${error.statusCode}]: ${message}`,
			);
		}
		throw error;
	}
}

export async function gotifyApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.limit = 100;
	do {
		responseData = await gotifyApiRequest.call(this, method, endpoint, body, query, uri);
		if (responseData.paging.next) {
			uri = responseData.paging.next;
		}
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.paging.next
	);

	return returnData;
}
