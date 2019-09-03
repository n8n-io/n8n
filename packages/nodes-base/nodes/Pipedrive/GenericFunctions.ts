import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';


export interface ICustomInterface {
	name: string;
	options?: Array<{
		id: number;
		label: string;
	}>;
}

/**
 * Make an API request to Pipedrive
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function pipedriveApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject, formData?: IDataObject, downloadFile?: boolean): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('pipedriveApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	if (query === undefined) {
		query = {};
	}

	query.api_token = credentials.apiToken;

	const options: OptionsWithUri = {
		method,
		qs: query,
		uri: `https://api.pipedrive.com/v1${endpoint}`,
	};

	if (downloadFile === true) {
		options.encoding = null;
	} else {
		options.json = true;
	}

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	if (formData !== undefined && Object.keys(formData).length !== 0) {
		options.formData = formData;
	}

	try {
		const responseData = await this.helpers.request(options);

		if (downloadFile === true) {
			return {
				data: responseData,
			};
		}

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



/**
 * Converts names and values of custom properties to their actual values
 *
 * @export
 * @param {(IHookFunctions | IExecuteFunctions)} this
 * @param {string} resource
 * @param {IDataObject[]} items
 * @returns {Promise<IDataObject[]>}
 */
export async function pipedriveResolveCustomProperties(this: IHookFunctions | IExecuteFunctions, resource: string, items: IDataObject[]): Promise<void> {

	const endpoints: { [key: string]: string } = {
		'activity': '/activityFields',
		'deal': '/dealFields',
		'organization': '/organizationFields',
		'person': '/personFields',
		'product': '/productFields',
	};

	if (endpoints[resource] === undefined) {
		throw new Error(`The resource "${resource}" is not supported for resolving custom values!`);
	}

	const requestMethod = 'GET';

	const body = {};
	const qs = {};
	// Get the custom properties and their values
	const responseData = await pipedriveApiRequest.call(this, requestMethod, endpoints[resource], body, qs);

	const customProperties: {
		[key: string]: ICustomInterface;
	} = {};

	for (const customPropertyData of responseData.data) {
		customProperties[customPropertyData.key] = customPropertyData;
	}

	let customPropertyData;

	for (const item of items) {
		// Itterate over all keys and replace the custom ones
		for (const key of Object.keys(item)) {
			if (customProperties[key] !== undefined) {
				// Is a custom property
				customPropertyData = customProperties[key];

				// Check if also the value has to be resolved or just the key
				if (item[key] !== null && item[key] !== undefined && customPropertyData.options !== undefined && Array.isArray(customPropertyData.options)) {
					// Has an option key so get the actual option-value
					const propertyOption = customPropertyData.options.find(option => option.id.toString() === item[key]!.toString());

					if (propertyOption !== undefined) {
						item[customPropertyData.name as string] = propertyOption.label;
						delete item[key];
					}
				} else {
					// Does already represent the actual value or is null
					item[customPropertyData.name as string] = item[key];
					delete item[key];
				}
			}
		}
	}

}
