import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	BINARY_ENCODING
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions
} from 'n8n-workflow';

export async function zulipApiRequest(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('zulipApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const base64Credentials = `${Buffer.from(`${credentials.email}:${credentials.apiKey}`).toString(BINARY_ENCODING)}`;

	const endpoint = `${credentials.url}/api/v1`;

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${base64Credentials}`,
		},
		method,
		form: body,
		qs: query,
		uri: uri || `${endpoint}${resource}`,
		json: true
	};
	if (!Object.keys(body).length) {
		delete options.form;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.response) {
			let errorMessage = error.response.body.message || error.response.body.description || error.message;
			throw new Error(`Zulip error response [${error.statusCode}]: ${errorMessage}`);
		}
		throw error;
	}
}
