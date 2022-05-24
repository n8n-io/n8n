import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

/**
 * Make an API request to Whatsapp
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('whatsAppApi');

	query = query || {};

	const options: OptionsWithUri = {
		headers: {
			"Authorization": `Bearer ${credentials.accessToken}`
		},
		method,
		body,
		qs: query,
		uri: `https://graph.facebook.com/v13.0/${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

