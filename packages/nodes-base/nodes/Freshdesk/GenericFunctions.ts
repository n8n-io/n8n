import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';

import * as _ from 'lodash';
import { IDataObject } from 'n8n-workflow';

export async function freshdeskApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, resource: string, method: string, action: string, body: any = {}, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('mandrillApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const data = Object.assign({}, body, { key: credentials.apiKey });

	const endpoint = 'mandrillapp.com/api/1.0';

	const options: OptionsWithUri = {
		headers,
		method,
		uri: `https://${endpoint}${resource}${action}.json`,
		body: data,
		json: true
	};


	try {
		return await this.helpers.request!(options);
	} catch (error) {
		console.error(error);

		const errorMessage = error.response.body.message || error.response.body.Message;
		if (error.name === 'Invalid_Key') {
			throw new Error('The provided API key is not a valid Mandrill API key');
		} else if (error.name === 'ValidationError') {
			throw new Error('The parameters passed to the API call are invalid or not provided when required');
		} else if (error.name === 'GeneralError') {
			throw new Error('An unexpected error occurred processing the request. Mandrill developers will be notified.');
		}

		if (errorMessage !== undefined) {
			throw errorMessage;
		}
		throw error.response.body;
	}
}
