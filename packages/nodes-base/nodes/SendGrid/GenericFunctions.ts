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

export async function sendGridApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, endpoint: string, method: string, body: any = {}, qs: IDataObject = {}, uri?: string | undefined): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('sendGridApi') as IDataObject;

	const host = 'api.sendgrid.com/v3';

	const options: OptionsWithUri = {
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
		method,
		qs,
		body,
		uri: uri || `https://${host}${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		//@ts-ignore
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.errors) {

			let errors = error.response.body.errors;

			errors = errors.map((e: IDataObject) => e.message);
			// Try to return the error prettier
			throw new Error(
				`SendGrid error response [${error.statusCode}]: ${errors.join('|')}`,
			);
		}
		throw error;
	}
}

export async function sendGridApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, endpoint: string, method: string, propertyName: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	let uri;

	do {
		responseData = await sendGridApiRequest.call(this, endpoint, method, body, query, uri);
		uri = responseData._metadata.next;
		returnData.push.apply(returnData, responseData[propertyName]);
		if (query.limit && returnData.length >= query.limit) {
			return returnData;
		}
	} while (
		responseData._metadata.next !== undefined
	);

	return returnData;
}
