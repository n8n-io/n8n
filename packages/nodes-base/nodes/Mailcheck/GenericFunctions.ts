import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import { IDataObject } from 'n8n-workflow';

export async function mailCheckApiRequest(
	this: IWebhookFunctions | IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('mailcheckApi');

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${credentials.apiKey}`,
		},
		method,
		body,
		qs,
		uri: uri || `https://api.mailcheck.co/v1${resource}`,
		json: true,
	};
	try {
		options = Object.assign({}, options, option);
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			throw new Error(
				`Mailcheck error response [${error.statusCode}]: ${error.response.body.message}`,
			);
		}
		throw error;
	}
}
