import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	get,
} from 'lodash';

import * as querystring from 'querystring';

export async function travisciApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('travisCiApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	let options: OptionsWithUri = {
		headers: {
			'Travis-API-Version': '3',
			'Accept': 'application/json',
			'Content-Type': 'application.json',
			'Authorization': `token ${credentials.apiToken}`,
		},
		method,
		qs,
		body,
		uri: uri || `https://api.travis-ci.com${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (err) {
		if (err.response && err.response.body && err.response.body.error_message) {
			// Try to return the error prettier
			throw new Error(`TravisCI error response [${err.statusCode}]: ${err.response.body.error_message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw err;
	}
}

/**
 * Make an API request to paginated TravisCI endpoint
 * and return all results
 */
export async function travisciApiRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await travisciApiRequest.call(this, method, resource, body, query);
		const path = get(responseData, '@pagination.next.@href');
		if (path !== undefined) {
			query = querystring.parse(path);
		}
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData['@pagination']['is_last'] !== true
	);
	return returnData;
}
