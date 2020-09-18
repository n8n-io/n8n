import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	BINARY_ENCODING
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function freshdeskApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('freshdeskApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const apiKey = `${credentials.apiKey}:X`;

	const endpoint = 'freshdesk.com/api/v2';

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `${Buffer.from(apiKey).toString(BINARY_ENCODING)}`,
		},
		method,
		body,
		qs: query,
		uri: uri || `https://${credentials.domain}.${endpoint}${resource}`,
		json: true
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
		if (error.response) {
			let errorMessage = error.response.body.message || error.response.body.description || error.message;
			if (error.response.body && error.response.body.errors) {
				errorMessage = error.response.body.errors.map((err: IDataObject) => `"${err.field}" => ${err.message}`).join(', ');
			}
			throw new Error(`Freshdesk error response [${error.statusCode}]: ${errorMessage}`);
		}

		throw error;
	}
}

export async function freshdeskApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.per_page = 100;
	do {
		responseData = await freshdeskApiRequest.call(this, method, endpoint, body, query, uri, { resolveWithFullResponse: true });
		if (responseData.headers.link) {
			uri = responseData.headers['link'].split(';')[0].replace('<', '').replace('>','');
		}
		returnData.push.apply(returnData, responseData.body);
	} while (
		responseData.headers['link'] !== undefined &&
		responseData.headers['link'].includes('rel="next"')
	);
	return returnData;
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = [];
	}
	return result;
}

export function capitalize(s: string): string {
	if (typeof s !== 'string') return '';
	return s.charAt(0).toUpperCase() + s.slice(1);
}
