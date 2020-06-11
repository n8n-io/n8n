import { IExecuteFunctions, IHookFunctions } from 'n8n-core';
import { OptionsWithUri } from 'request';

import { IDataObject } from 'n8n-workflow';

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
	query?: IDataObject
): Promise<any> {
	const credentials = this.getCredentials('messageBirdApi');
	if (credentials === undefined) {
		throw new Error('No credentials returned!');
	}

	if (query === undefined) {
		query = {};
	}
	let token;
	token = token = `AccessKey ${credentials.accessKey}`;

	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			Authorization: token
		},
		method,
		qs: query,
		body,
		uri: `https://rest.messagebird.com${resource}`,
		json: true
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		if (error.statusCode === 401) {
			throw new Error('The Message Bird credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.errors) {
			// Try to return the error prettier
			let errorMessage;
			for (let i = 0; i < error.response.body.errors.length; i++) {
				errorMessage =
					errorMessage +
					`Message Bird Error response [${error.statusCode}]: ${error.response.body.errors[i].description}`;
			}
			throw new Error(errorMessage);
		}

		// If that data does not exist for some reason return the actual error
		throw new Error(
			`Message Bird error ${error.response.body.errors[0].description}`
		);
	}
}
