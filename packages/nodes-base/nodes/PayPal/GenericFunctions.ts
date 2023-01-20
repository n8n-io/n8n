import { OptionsWithUri } from 'request';

import {
	BINARY_ENCODING,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import { IDataObject, NodeApiError, NodeOperationError } from 'n8n-workflow';

function getEnvironment(env: string) {
	return {
		sanbox: 'https://api-m.sandbox.paypal.com',
		live: 'https://api-m.paypal.com',
	}[env];
}

async function getAccessToken(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IWebhookFunctions,
): Promise<any> {
	const credentials = await this.getCredentials('payPalApi');
	const env = getEnvironment(credentials.env as string);
	const data = Buffer.from(`${credentials.clientId}:${credentials.secret}`).toString(
		BINARY_ENCODING,
	);
	const headerWithAuthentication = Object.assign(
		{},
		{ Authorization: `Basic ${data}`, 'Content-Type': 'application/x-www-form-urlencoded' },
	);
	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method: 'POST',
		form: {
			grant_type: 'client_credentials',
		},
		uri: `${env}/v1/oauth2/token`,
		json: true,
	};
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeOperationError(this.getNode(), error);
	}
}

export async function payPalApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IWebhookFunctions,
	endpoint: string,
	method: string,

	body: any = {},
	query?: IDataObject,
	uri?: string,
): Promise<any> {
	const credentials = await this.getCredentials('payPalApi');
	const env = getEnvironment(credentials.env as string);
	const tokenInfo = await getAccessToken.call(this);
	const headerWithAuthentication = Object.assign(
		{},
		{ Authorization: `Bearer ${tokenInfo.access_token}`, 'Content-Type': 'application/json' },
	);
	const options = {
		headers: headerWithAuthentication,
		method,
		qs: query || {},
		uri: uri || `${env}/v1${endpoint}`,
		body,
		json: true,
	};
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

function getNext(links: IDataObject[]): string | undefined {
	for (const link of links) {
		if (link.rel === 'next') {
			return link.href as string;
		}
	}
	return undefined;
}

/**
 * Make an API request to paginated paypal endpoint
 * and return all results
 */
export async function payPalApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	propertyName: string,
	endpoint: string,
	method: string,

	body: any = {},
	query?: IDataObject,
	uri?: string,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query!.page_size = 1000;

	do {
		responseData = await payPalApiRequest.call(this, endpoint, method, body, query, uri);
		uri = getNext(responseData.links);
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (getNext(responseData.links) !== undefined);

	return returnData;
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = '';
	}
	return result;
}

export function upperFist(s: string): string {
	return s
		.split('.')
		.map((e) => {
			return e.toLowerCase().charAt(0).toUpperCase() + e.toLowerCase().slice(1);
		})
		.join(' ');
}
