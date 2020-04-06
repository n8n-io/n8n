import {
	OptionsWithUri,
 } from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

import {
	snakeCase,
} from 'change-case';

export async function pagerDutyApiRequest(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, headers: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('pagerDutyApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/vnd.pagerduty+json;version=2',
			Authorization: `Token token=${credentials.apiToken}`,
		},
		method,
		body,
		qs: query,
		uri: uri || `https://api.pagerduty.com${resource}`,
		json: true,
		qsStringifyOptions: {
			arrayFormat: 'brackets',
		},
	};
	if (!Object.keys(body).length) {
		delete options.form;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options.headers = Object.assign({}, options.headers, headers);
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.error && error.response.body.error.errors) {
			// Try to return the error prettier
				//@ts-ignore
				throw new Error(`PagerDuty error response [${error.statusCode}]: ${error.response.body.error.errors.join(' | ')}`);
		}
		throw error;
	}
}
export async function pagerDutyApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	query.limit = 100;
	query.offset = 0;

	do {
		responseData = await pagerDutyApiRequest.call(this, method, endpoint, body, query);
		query.offset++;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.more
	);

	return returnData;
}

export function keysToSnakeCase(elements: IDataObject[] | IDataObject) : IDataObject[] {
	if (!Array.isArray(elements)) {
		elements = [elements];
	}
	for (const element of elements) {
		for (const key of Object.keys(element)) {
			if (key !== snakeCase(key)) {
				element[snakeCase(key)] = element[key];
				delete element[key];
			}
		}
	}
	return elements;
}
