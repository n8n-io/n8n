import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject,
	IPollFunctions,
} from 'n8n-workflow';

/**
 * Make an API request to Airtable
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('stackbyApi') as IDataObject;

	const options: OptionsWithUri = {
		headers: {
			'api-key': credentials.apiKey,
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs: query,
		uri: uri || `https://stackby.com/api/betav1${endpoint}`,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.request!(options);

	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The stackby credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.error) {
			// Try to return the error prettier
			const message = error.response.body.error;

			throw new Error(`Stackby error response [${error.statusCode}]: ${message}`);
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
export async function apiRequestAllItems(this: IHookFunctions | IExecuteFunctions | IPollFunctions, method: string, endpoint: string, body: IDataObject = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	query.maxrecord = 100;

	query.offset = 0;

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData);
		query.offset += query.maxrecord;

	} while (
		responseData.length !== 0
	);

	return returnData;
}

export interface IRecord {
	field: {
		[key: string]: string
	};
}

