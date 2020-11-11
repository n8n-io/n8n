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
	IDataObject,
} from 'n8n-workflow';

export async function strapiApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, headers: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('strapiApi') as IDataObject;

	try {
		const options: OptionsWithUri = {
			headers: {
				'Authorization': `Bearer ${qs.jwt}`,
			},
			method,
			body,
			qs,
			uri: uri || `${credentials.url}${resource}`,
			json: true,
		};
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		delete qs.jwt;

		//@ts-ignore
		return await this.helpers?.request(options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.message) {

			let messages = error.response.body.message;

			if (Array.isArray(error.response.body.message)) {
				messages = messages[0].messages.map((e: IDataObject) => e.message).join('|');
			}
			// Try to return the error prettier
			throw new Error(
				`Strapi error response [${error.statusCode}]: ${messages}`,
			);
		}
		throw error;
	}
}

export async function getToken(this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('strapiApi') as IDataObject;

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

export async function strapiApiRequestAllItems(this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query._limit = 20;

	query._start = 0;

	do {
		responseData = await strapiApiRequest.call(this, method, resource, body, query);
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
