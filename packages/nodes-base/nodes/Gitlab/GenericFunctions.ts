import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

/**
 * Make an API request to Gitlab
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function gitlabApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('gitlabApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const options = {
		method,
		headers: {
			'Private-Token': `${credentials.accessToken}`,
		},
		body,
		qs: query,
		uri: `${(credentials.server as string).replace(/\/$/, '')}/api/v4${endpoint}`,
		json: true
	};

	try {
		//@ts-ignore
		return await this.helpers?.request(options);

	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Gitlab credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			throw new Error(`Gitlab error response [${error.statusCode}]: ${error.response.body.message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}
