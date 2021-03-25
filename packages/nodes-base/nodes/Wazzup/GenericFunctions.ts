import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

/**
 * Make an API request to Wazzup
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function wazzupApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('wazzupApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	if (query === undefined) {
		query = {};
	}

	const options = {
		method,
		form: body,
		qs: query,
		uri: `https://api.wazzup24.com/v2${endpoint}`,
		headers: {
			'Authorization': `Basic ${credentials.authToken as string}`,
		},
		json: true,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Wazzup credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			let errorMessage = `Wazzup error response [${error.statusCode}]: ${error.response.body.message}`;
			if (error.response.body.more_info) {
				errorMessage = `errorMessage (${error.response.body.more_info})`;
			}

			throw new Error(errorMessage);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}
