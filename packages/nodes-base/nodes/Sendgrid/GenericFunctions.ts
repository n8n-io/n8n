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

export async function sendgridApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, endpoint: string, method: string, body: any = {}, qs: IDataObject = {} ,headers?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('sendgridApi') as IDataObject;

	const host = 'api.sendgrid.com/v3';

	const options: OptionsWithUri = {
		headers: {
            'Accept': 'application/json',
            // 'Authorization': `Bearer ${credentials.apiKey}`,
		},
		method,
		qs,
        body,
        uri: `https://${host}${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
        //@ts-ignore
        options.headers = Object.assign({}, headers, { Authorization: `Bearer ${credentials.apiKey}` });
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errors = error.response.body.error.errors;

			errors = errors.map((e: IDataObject) => e.message);
			// Try to return the error prettier
			throw new Error(
				`Sendgrid error response [${error.statusCode}]: ${errors.join('|')}`,
			);
		}
		throw error;
	}
}

export async function sendgridApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, endpoint: string, method: string, propertyName: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.offset = 0;
	query.count = 100;

	do {
		responseData = await sendgridApiRequest.call(this, endpoint, method, body, query);
		returnData.push.apply(returnData, responseData[propertyName]);
		query.offset += query.count;
	} while (
		responseData[propertyName].next && responseData[propertyName].length !== 0
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