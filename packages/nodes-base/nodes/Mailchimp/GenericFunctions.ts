import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';

export async function mailchimpApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, resource: string, method: string, body: any = {}, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('mailchimpApi');
	const datacenter = credentials!.datacenter as string;

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const headerWithAuthentication = Object.assign({}, headers, { Authorization: `apikey ${credentials.apiKey}` });

	const endpoint = 'api.mailchimp.com/3.0';

	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		uri: `https://${datacenter}.${endpoint}${resource}`,
		json: true
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
