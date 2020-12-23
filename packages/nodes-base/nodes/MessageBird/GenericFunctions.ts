import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
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
	const credentials = this.getCredentials('messageBirdApi');
	if (credentials === undefined) {
		throw new Error('No credentials returned!');
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
		if (error.statusCode === 401) {
			throw new Error('The Message Bird credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.errors) {
			// Try to return the error prettier
			const errorMessage = error.response.body.errors.map((e: IDataObject) => e.description);

			throw new Error(`MessageBird Error response [${error.statusCode}]: ${errorMessage.join('|')}`);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}
