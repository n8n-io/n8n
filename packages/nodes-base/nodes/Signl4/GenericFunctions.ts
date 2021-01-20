import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	OptionsWithUri,
 } from 'request';
 
/**
 * Make an API request to SIGNL4
 *
 * @param {IHookFunctions | IExecuteFunctions} this
 * @param {object} message
 * @returns {Promise<any>}
 */

export async function SIGNL4ApiRequest(this: IExecuteFunctions, method: string, contentType: string, body: string, query: IDataObject = {}, teamSecret?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	let options: OptionsWithUri = {
		headers: {
			'Accept': '*/*',
			'Content-Type': contentType
		},
		method,
		body,
		qs: query,
		uri: "https://connect.signl4.com/webhook/" + teamSecret,
		json: false,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);

	try {
		return await this.helpers.request!(options);
	} catch (error) {

		if (error.response && error.response.body && error.response.body.details) {
			throw new Error(`SIGNL4 error response [${error.statusCode}]: ${error.response.body.details}`);
		}

		throw error;
	}
}
