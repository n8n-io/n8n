import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

/**
 * Format a JavaScript date as a YYYY-MM-DD string
 *
 * @param {date} date
 * @returns {string}
 */
export function formatDate(date: Date): string {
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
 * @returns {Promise<any>}
 */
export async function nasaApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, qs: IDataObject, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const options: OptionsWithUri = {
		method,
		qs,
		uri: '',
		json: true,
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

			console.log("URL:\n" + options.uri);
			console.log("QUERY STRINGS:")
			console.log(options.qs);

			console.log(options);

			return await this.helpers.request(options);

	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The NASA credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			throw new Error(`NASA error response [${error.statusCode}]: ${error.response.body.message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

