import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
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

	const endpoint = `${credentials.url}/api/v1`;

	let options: OptionsWithUri = {
		auth: {
			user: credentials.email as string,
			password: credentials.apiKey as string,
		},
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method,
		form: body,
		qs: query,
		uri: uri || `${endpoint}${resource}`,
		json: true,
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
			const errorMessage = error.response.body.message || error.response.body.description || error.message;
			throw new Error(`Zulip error response [${error.statusCode}]: ${errorMessage}`);
		}
		throw error;
	}
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
