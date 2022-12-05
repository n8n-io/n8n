import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject } from 'n8n-workflow';

export async function sendGridApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	endpoint: string,
	method: string,

	body: any = {},
	qs: IDataObject = {},
	option: IDataObject = {},
): Promise<any> {
	const host = 'api.sendgrid.com/v3';

	const options: OptionsWithUri = {
		method,
		qs,
		body,
		uri: `https://${host}${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	return this.helpers.requestWithAuthentication.call(this, 'sendGridApi', options);
}

export async function sendGridApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	endpoint: string,
	method: string,
	propertyName: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
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
	} while (responseData._metadata.next !== undefined);

	return returnData;
}
