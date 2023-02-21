import type { OptionsWithUri } from 'request';
import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';
import type { IDataObject } from 'n8n-workflow';

export async function persioApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IWebhookFunctions,
	method: string,
	uri: string,
	body: any = {},
	_option: IDataObject = {},
	qs: IDataObject = {},
): Promise<any> {
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}
	console.log(options);
	return this.helpers.requestWithAuthentication.call(this, 'persioApi', options);
}

export const propertyEvents = ['user.updated'];
