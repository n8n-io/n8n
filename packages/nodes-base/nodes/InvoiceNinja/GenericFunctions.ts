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
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

import {
	get,
} from 'lodash';

export async function invoiceNinjaApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query?: IDataObject, uri?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('invoiceNinjaApi');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const baseUrl = credentials!.url || 'https://app.invoiceninja.com';
	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'X-Ninja-Token': credentials.apiToken,
		},
		method,
		qs: query,
		uri: uri || `${baseUrl}/api/v1${endpoint}`,
		body,
		json: true,
	};
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function invoiceNinjaApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let uri;
	query.per_page = 100;

	do {
		responseData = await invoiceNinjaApiRequest.call(this, method, endpoint, body, query, uri);
		const next = get(responseData, 'meta.pagination.links.next') as string | undefined;
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
