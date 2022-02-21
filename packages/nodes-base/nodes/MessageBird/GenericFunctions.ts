import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

/**
 * Make an API request to Message Bird
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function messageBirdApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	resource: string,
	body: IDataObject,
	query: IDataObject = {},
): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('messageBirdApi');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials returned!');
	}

	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			Authorization: `AccessKey ${credentials.accessKey}`,
		},
		method,
		qs: query,
		body,
		uri: `https://rest.messagebird.com${resource}`,
		json: true,
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
