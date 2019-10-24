import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { OptionsWithUri } from 'request';
import { IDataObject } from 'n8n-workflow';


export interface IAttachment {
	fields: {
		item?: object[];
	};
}


/**
 * Make an API request to Telegram
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('mattermostApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	query = query || {};

	const options: OptionsWithUri = {
		method,
		body,
		qs: query,
		uri: `${credentials.baseUrl}/api/v4/${endpoint}`,
		headers: {
			Authorization: `Bearer ${credentials.accessToken}`,
			'content-type': 'application/json; charset=utf-8'
		},
		json: true
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {

		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Mattermost credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			const errorBody = error.response.body;
			throw new Error(`Mattermost error response: ${errorBody.message}`);
		}

		// Expected error data did not get returned so throw the actual error
		throw error;
	}
}
