import { OptionsWithUri } from 'request';
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

export async function helpscoutApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IHookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://api.helpscout.net${resource}`,
		json: true,
	};
	try {
		if (Object.keys(option).length !== 0) {
			options = Object.assign({}, options, option);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'helpScoutOAuth2Api', options);
	} catch (error) {
		if (error.response && error.response.body
		&&	error.response.body._embedded
		&&	error.response.body._embedded.errors) {
			// Try to return the error prettier
			//@ts-ignore
			throw new Error(`HelpScout error response [${error.statusCode}]: ${error.response.body.message} - ${error.response.body._embedded.errors.map(error => {
				return `${error.path} ${error.message}`;
			}).join('-')}`);
		}

		throw new Error(`HelpScout error response [${error.statusCode}]: ${error.message}`);
	}
}

export async function helpscoutApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions, propertyName: string ,method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let uri;

	do {
		responseData = await helpscoutApiRequest.call(this, method, endpoint, body, query, uri);
		uri = get(responseData, '_links.next.href');
		returnData.push.apply(returnData, get(responseData, propertyName));
		if (query.limit && query.limit <= returnData.length) {
			return returnData;
		}
	} while (
		responseData['_links'] !== undefined &&
		responseData['_links'].next !== undefined &&
		responseData['_links'].next.href !== undefined
	);

	return returnData;
}
