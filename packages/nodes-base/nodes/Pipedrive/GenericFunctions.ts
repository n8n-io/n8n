import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

/**
 * Make an API request to Pipedrive
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function pipedriveApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('pipedriveApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	if (query === undefined) {
		query = {};
	}

	query.api_token = credentials.apiToken;

	const options = {
		method,
		body,
		qs: query,
		uri: `https://api.pipedrive.com/v1${endpoint}`,
		json: true
	};

	try {
		const responseData = await this.helpers.request(options);

		if (responseData.success === false) {
			throw new Error(`Pipedrive error response: ${responseData.error} (${responseData.error_info})`);
		}

		return {
			additionalData: responseData.additional_data,
			data: responseData.data,
		};
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Pipedrive credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.error) {
			// Try to return the error prettier
			let errorMessage = `Pipedrive error response [${error.statusCode}]: ${error.response.body.error}`;
			if (error.response.body.error_info) {
				errorMessage += ` - ${error.response.body.error_info}`;
			}
			throw new Error(errorMessage);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}



/**
 * Make an API request to paginated Pipedrive endpoint
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
export async function pipedriveApiRequestAllItems(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any

	if (query === undefined) {
		query = {};
	}
	query.limit = 500;
	query.start = 0;

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await pipedriveApiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData.data);

		query.start = responseData.additionalData.pagination.next_start;
	} while (
		responseData.additionalData !== undefined &&
		responseData.additionalData.pagination !== undefined &&
		responseData.additionalData.pagination.more_items_in_collection === true
	);

	return {
		data: returnData
	};
}
