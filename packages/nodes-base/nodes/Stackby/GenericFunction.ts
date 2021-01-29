import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	IPollFunctions,
} from 'n8n-workflow';


interface IAttachment {
	url: string;
	filename: string;
	type: string;
}

export interface IRecord {
	fields: {
		[key: string]: string | IAttachment[],
	};
}

/**
 * Make an API request to Airtable
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, method: string, endpoint: string, body: string, query?: IDataObject, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('stackbyApiKey');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	query = query || {};

	// For some reason for some endpoints the bearer auth does not work
	// and it returns 404 like for the /meta request. So we always send
	// it as query string.
	query.api_key = credentials.apiKey;

	const options: OptionsWithUri = {
		headers: {
			'api-key': credentials.apiKey,
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs: query,
		uri: uri || `https://dev9.stackby.com/api/betav1/${endpoint}`,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}	
	try {
		console.log(options, query.sort);
		const value= await this.helpers.request!(options);
		return value;
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The stackby credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.error) {
			// Try to return the error prettier

			const stackbyError = error.response.body.error;

			if (stackbyError.type && stackbyError.message) {
				throw new Error(`stackby error response [${stackbyError.type}]: ${stackbyError.message}`);
			}
		}

		// Expected error data did not get returned so rhow the actual error
		throw error;
	}
}


/**
 * Make an API request to paginated Airtable endpoint
 * and return all results
 *
 * @export
 * @param {(IHookFunctions | IExecuteFunctions)} this
 * @param {string} method
 * @param {string} endpoint
 * @param {IDataObject} body
 * @param {IDataObject} [query]
 * @returns {Promise<any>}
 */
export async function apiRequestAllItems(this: IHookFunctions | IExecuteFunctions | IPollFunctions, method: string, endpoint: string, body: string, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any

	if (query === undefined) {
		query = {};
	}
	query.pageSize = 100;

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		console.log(responseData);
		returnData.push.apply(returnData, responseData);

		query.offset = responseData.offset;
	} while (
		responseData.offset !== undefined
	);
	
	return {
		records: returnData,
	};
}
