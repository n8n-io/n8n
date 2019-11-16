import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';

export async function intercomApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, resource: string, method: string, body: any = {}, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('intercomApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const headerWithAuthentication = Object.assign({}, headers,
		{ Authorization: `Bearer ${credentials.apiKey}`, Accept: 'application/json' });

	const endpoint = 'api.intercom.io';

	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		uri: `https://${endpoint}${resource}`,
		body,
		json: true
	};

	console.log(options)


	try {
		return await this.helpers.request!(options);
	} catch (error) {
		console.error(error);

		const errorMessage = error.response.body.message || error.response.body.Message;

		if (errorMessage !== undefined) {
			throw errorMessage;
		}
		throw error.response.body;
	}
}
