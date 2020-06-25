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
 * Create a JavaScript date that is thirty days before the current date
 *
 * @param {void}
 * @returns {Date}
 */
export function thirtyDaysAgo() {
	return new Date(new Date().setDate(new Date().getDate()-30));
}

/**
 * Format a JavaScript date as a YYYY-MM-DD string
 *
 * @param {date} date
 * @returns {string}
 */
export function formatDate(date: Date) {
	let month = (date.getMonth() + 1).toString();
	let day = '' + date.getDate().toString();
	const year = date.getFullYear();

	if (month.length < 2) {
		month = '0' + month;
	}

	if (day.length < 2) {
		day = '0' + day;
	}

	return [year, month, day].join('-');
}

/**
 * Make an API request to NASA
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @param {IDataObject} option
 * @returns {Promise<any>}
 */
export async function nasaApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	option: IDataObject = {}
): Promise<any> { // tslint:disable-line:no-any

	const options: OptionsWithUri = {
		method,
		headers: {
			'User-Agent': 'n8n',
		},
		qs,
		uri: '',
		json: true
	};

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	try {
			const credentials = this.getCredentials('nasaApi');

			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.qs.api_key = credentials["api_key"];

			const baseUrl = 'https://api.nasa.gov';
			options.uri = `${baseUrl}${endpoint}`;

			return await this.helpers.request(options);

	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The NASA credentials are not valid!');
		}

		if (error.statusCode && error.error.msg) {
			// Try to return the error prettier
			throw new Error(`NASA error response [${error.statusCode}]: ${error.error.msg}`);
		}

		if (error.statusCode && error.error.error_message) {
			// Try to return the error prettier
			throw new Error(`NASA error response [${error.statusCode}]: ${error.error.error_message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

/**
 * Make an API request to NASA and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 * @param {string} method
 * @param {string} endpoint
 * @param {IDataObject} qs
 * @returns {Promise<any>}
 */
export async function nasaApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	option?: { limit: number }
): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData: any; // tslint:disable-line:no-any
	let itemsReceived = 0;
	let total: number;

	do {
		responseData = await nasaApiRequest.call(this, method, endpoint, qs);
		returnData.push.apply(returnData, responseData.near_earth_objects);
		total = option ? option.limit : responseData.page.total_elements as number;

		if (returnData !== undefined) {
			itemsReceived += returnData.length;
		}

	} while (
		total > itemsReceived
	);

	// remove excess results
	if (option && option.limit < returnData.length) {
		return returnData.slice(0, option.limit);
	}

	return returnData;
}
