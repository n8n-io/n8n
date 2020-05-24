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

export async function mailchimpApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, endpoint: string, method: string, body: any = {}, qs: IDataObject = {} ,headers?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('mailchimpApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const headerWithAuthentication = Object.assign({}, headers, { Authorization: `apikey ${credentials.apiKey}` });

	if (!(credentials.apiKey as string).includes('-')) {
		throw new Error('The API key is not valid!');
	}

	const datacenter = (credentials.apiKey as string).split('-').pop();

	const host = 'api.mailchimp.com/3.0';

	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		qs,
		uri: `https://${datacenter}.${host}${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.response.body && error.response.body.detail) {
			throw new Error(`Mailchimp Error response [${error.statusCode}]: ${error.response.body.detail}`);
		}
		throw error;
	}
}

export async function mailchimpApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, endpoint: string, method: string, propertyName: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.offset = 0;
	query.count = 500;

	do {
		responseData = await mailchimpApiRequest.call(this, endpoint, method, body, query);
		returnData.push.apply(returnData, responseData[propertyName]);
		query.offset += query.count;
	} while (
		responseData[propertyName] && responseData[propertyName].length !== 0
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
