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
	IDataObject, IOAuth2Options, NodeApiError,
} from 'n8n-workflow';

import {
	snakeCase,
} from 'change-case';

export async function shopifyApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const authenticationMethod = this.getNodeParameter('authentication', 0, 'oAuth2') as string;

	let credentials;
	let credentialType = 'shopifyOAuth2Api';

	if (authenticationMethod === 'apiKey') {
		credentials = await this.getCredentials('shopifyApi');
		credentialType = 'shopifyApi';

	} else if (authenticationMethod === 'accessToken') {
		credentials = await this.getCredentials('shopifyAccessTokenApi');
		credentialType = 'shopifyAccessTokenApi';

	} else {
		credentials = await this.getCredentials('shopifyOAuth2Api');
	}

	const options: OptionsWithUri = {
		method,
		qs: query,
		uri: uri || `https://${credentials.shopSubdomain}.myshopify.com/admin/api/2019-10${resource}`,
		body,
		json: true,
	};

	const oAuth2Options: IOAuth2Options = {
		tokenType: 'Bearer',
		keyToIncludeInAccessTokenHeader: 'X-Shopify-Access-Token',
	};

	if (authenticationMethod === 'apiKey') {
		Object.assign(options, { auth: { username: credentials.apiKey, password: credentials.password  } });
	}

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
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options, { oauth2:  oAuth2Options });
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
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
