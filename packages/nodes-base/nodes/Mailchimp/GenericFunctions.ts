import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';

export async function mailchimpApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, endpoint: string, method: string, body: any = {}, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('mailchimpApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const headerWithAuthentication = Object.assign({}, headers, { Authorization: `apikey ${credentials.apiKey}` });

	if (!(credentials.apiKey as string).includes('-')) {
		throw new Error('The API key is not valid!');
	}

	const datacenter = (credentials.apiKey as string).split('-').pop();

	const host = 'api.mailchimp.com/3.0';

	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		uri: `https://${datacenter}.${host}${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		const errorMessage = error.response.body.message || error.response.body.Message;

		if (errorMessage !== undefined) {
			throw errorMessage;
		}
		throw error.response.body;
	}
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = '';
	}
	return result;
}
