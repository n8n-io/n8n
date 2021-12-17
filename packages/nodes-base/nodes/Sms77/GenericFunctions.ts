import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

/**
 * Make an API request to Sms77
 *
 * @param {IHookFunctions | IExecuteFunctions} this
 * @param {string} method
 * @param {Endpoint} endpoint
 * @param {object | undefined} data
 * @returns {Promise<any>}
 */
export async function sms77ApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: IDataObject, qs: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('sms77Api');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const options: OptionsWithUri = {
		headers: {
			SentWith: 'n8n',
			'X-Api-Key': credentials.apiKey,
		},
		qs,
		uri: `https://gateway.sms77.io/api${endpoint}`,
		json: true,
		method,
	};

	if (Object.keys(body).length) {
		options.form = body;
		body.json = 1;
	}

	const response = await this.helpers.request(options);

	if (response.success !== '100') {
		throw new NodeApiError(this.getNode(), response, { message: 'Invalid sms77 credentials or API error!' });
	}

	return response;
}
