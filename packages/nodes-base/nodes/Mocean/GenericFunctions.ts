import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

/**
 * Make an API request to Twilio
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function moceanApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('moceanApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	if (query === undefined) {
		query = {};
    }
    
    if (method === 'POST') {
        body['mocean-api-key'] = credentials['mocean-api-key'];
		body['mocean-api-secret'] = credentials['mocean-api-secret'];
		body['mocean-resp-format'] = 'JSON';
    } else if(method === 'GET') {
        query['mocean-api-key'] = credentials['mocean-api-key'];
		query['mocean-api-secret'] = credentials['mocean-api-secret'];
		query['mocean-resp-format'] = 'JSON';
    }
	console.log(body);
	const options = {
		method,
		form: body,
		qs: query,
		uri: `https://rest.moceanapi.com${endpoint}`,
		json: true
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('Authentication fail.');
		}

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			let errorMessage = `Twilio error response [${error.statusCode}]: ${error.response.body.message}`;
			if (error.response.body.more_info) {
				errorMessage = `errorMessage (${error.response.body.more_info})`;
			}

			throw new Error(errorMessage);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}