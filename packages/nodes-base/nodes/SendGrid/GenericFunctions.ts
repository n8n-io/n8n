import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import type { IDataObject } from 'n8n-workflow';

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

	if (Object.keys(body as IDataObject).length === 0) {
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
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		responseData = await sendGridApiRequest.call(this, endpoint, method, body, query, uri); // posible bug, as function does not have uri parameter
		uri = responseData._metadata.next;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		if (query.limit && returnData.length >= query.limit) {
			return returnData;
		}
	} while (responseData._metadata.next !== undefined);

	return returnData;
}
