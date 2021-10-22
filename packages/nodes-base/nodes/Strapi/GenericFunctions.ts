import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function strapiApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, headers: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('strapiApi') as IDataObject;

	try {
		const options: OptionsWithUri = {
			headers: {},
			method,
			body,
			qs,
			uri: uri || `${credentials.url}${resource}`,
			json: true,
			qsStringifyOptions: {
				arrayFormat: 'indice',
			},
		};
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		//@ts-ignore
		return await this.helpers?.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function getToken(this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('strapiApi') as IDataObject;

	const options: OptionsWithUri = {
		headers: {
			'content-type': `application/json`,
		},
		method: 'POST',
		uri: `${credentials.url}/auth/local`,
		body: {
			identifier: credentials.email,
			password: credentials.password,
		},
		json: true,
	};

	return this.helpers.request!(options);
}

export async function strapiApiRequestAllItems(this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, headers: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query._limit = 20;

	query._start = 0;

	do {
		responseData = await strapiApiRequest.call(this, method, resource, body, query, undefined, headers);
		query._start += query._limit;
		returnData.push.apply(returnData, responseData);
	} while (
		responseData.length !== 0
	);

	return returnData;
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
