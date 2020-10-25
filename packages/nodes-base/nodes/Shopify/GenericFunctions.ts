import {
	OptionsWithUri,
} from 'request';

import {
	BINARY_ENCODING,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	snakeCase,
} from 'change-case';

export async function shopifyApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('shopifyApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const headerWithAuthentication = Object.assign({},
		{ Authorization: ` Basic ${Buffer.from(`${credentials.apiKey}:${credentials.password}`).toString(BINARY_ENCODING)}` });

	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		qs: query,
		uri: uri || `https://${credentials.shopSubdomain}.myshopify.com/admin/api/2019-10${resource}`,
		body,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}
	if (Object.keys(body).length === 0) {
		delete options.body;
	}
	if (Object.keys(query).length === 0) {
		delete options.qs;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.response.body && error.response.body.errors) {
			let message = '';
			if (typeof error.response.body.errors === 'object') {
				for (const key of Object.keys(error.response.body.errors)) {
					message += error.response.body.errors[key];
				}
			} else {
				message = `${error.response.body.errors} |`;
			}
			const errorMessage = `Shopify error response [${error.statusCode}]: ${message}`;
			throw new Error(errorMessage);
		}

		throw error;
	}
}


export async function shopifyApiRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	let uri: string | undefined;

	do {
		responseData = await shopifyApiRequest.call(this, method, resource, body, query, uri, { resolveWithFullResponse: true });
		if (responseData.headers.link) {
			uri = responseData.headers['link'].split(';')[0].replace('<', '').replace('>', '');
		}
		returnData.push.apply(returnData, responseData.body[propertyName]);
	} while (
		responseData.headers['link'] !== undefined &&
		responseData.headers['link'].includes('rel="next"')
	);
	return returnData;
}

export function keysToSnakeCase(elements: IDataObject[] | IDataObject): IDataObject[] {
	if (elements === undefined) {
		return [];
	}
	if (!Array.isArray(elements)) {
		elements = [elements];
	}
	for (const element of elements) {
		for (const key of Object.keys(element)) {
			if (key !== snakeCase(key)) {
				element[snakeCase(key)] = element[key];
				delete element[key];
			}
		}
	}
	return elements;
}
