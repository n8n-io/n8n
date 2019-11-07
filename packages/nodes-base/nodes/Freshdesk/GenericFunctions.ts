import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
	BINARY_ENCODING
} from 'n8n-core';

import * as _ from 'lodash';
import { IDataObject } from 'n8n-workflow';

export async function freshdeskApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, resource: string, method: string, body: any = {}, headers?: object): Promise<any> { // tslint:disable-line:no-any
	
	const credentials = this.getCredentials('freshdeskApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const userpass = `${credentials.username}:${credentials.password}`

	const headerWithAuthentication = Object.assign({}, headers, { Authorization: `Basic ${Buffer.from(userpass).toString(BINARY_ENCODING)}` });

	const endpoint = 'freshdesk.com/api/v2/';

	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		body,
		uri: `https://${credentials.domain}.${endpoint}${resource}`,
		json: true
	};

	if (_.isEmpty(options.body)) {
		delete options.body
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
