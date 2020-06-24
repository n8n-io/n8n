import {
	OptionsWithUri,
 } from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions
} from 'n8n-workflow';


export async function postmarkApiRequest(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, method : string, endpoint : string, body: any = {}, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('postmarkApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'X-Postmark-Server-Token' : credentials.serverToken
		},
		method,
		body,
		uri: 'https://api.postmarkapp.com' + endpoint,
		json: true
	};
	if (body === {}) {
		delete options.body;
	}
	options = Object.assign({}, options, option);

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new Error(`Postmark: ${error.statusCode} Message: ${error.message}`);
	}
}


