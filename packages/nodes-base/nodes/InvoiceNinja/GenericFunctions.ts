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

import { get } from 'lodash';

export async function invoiceninjaApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query?: IDataObject, uri?: string): Promise<any> { // tslint:disable-line:no-any
	let token;
	let endpoint;
	const cloudCredentials = this.getCredentials('invoiceNinjaCloudApi');
	const serverCredentials = this.getCredentials('invoiceNinjaServerApi');
	if (cloudCredentials === undefined && serverCredentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	if (cloudCredentials !== undefined) {
		endpoint = 'https://app.invoiceninja.com';
		token = cloudCredentials!.apiToken;
	} else {
		endpoint = serverCredentials!.domain;
		token = serverCredentials!.apiToken;
	}
	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'X-Ninja-Token': token,
		},
		method,
		qs: query,
		uri: uri || `${endpoint}/api/v1${resource}`,
		body,
		json: true
	};
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.errors) {
			// Try to return the error prettier
			const errorMessages = Object.keys(error.response.body.errors).map(errorName => {
				return (error.response.body.errors[errorName] as [string]).join('');
			});
			throw new Error(`Invoice Ninja error response [${error.statusCode}]: ${errorMessages.join(' | ')}`);
		}

		throw error;
	}
}

export async function invoiceninjaApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let uri;
	query.per_page = 100;

	do {
		responseData = await invoiceninjaApiRequest.call(this, method, endpoint, body, query, uri);
		let next = get(responseData, 'meta.pagination.links.next') as string | undefined;
		if (next) {
			uri = next;
		}
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.meta !== undefined &&
		responseData.meta.pagination &&
		responseData.meta.pagination.links &&
		responseData.meta.pagination.links.next
	);

	return returnData;
}
