import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
	BINARY_ENCODING
} from 'n8n-core';

import * as _ from 'lodash';

export async function rocketchatApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, resource: string, method: string, body: any = {}, headers?: object): Promise<any> { // tslint:disable-line:no-any
	
	const credentials = this.getCredentials('rocketchatApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const  apiKey = `${credentials.apiKey}:X`;

	const headerWithAuthentication = Object.assign({}, headers, { Authorization: `${Buffer.from(apiKey).toString(BINARY_ENCODING)}` });

	const endpoint = '';

	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		body,
		uri: `https://${credentials.domain}.${endpoint}${resource}`,
		json: true
	};

	if (_.isEmpty(options.body)) {
		delete options.body;
	}

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
