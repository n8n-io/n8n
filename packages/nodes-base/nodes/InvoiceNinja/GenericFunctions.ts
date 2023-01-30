import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import type { IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { get } from 'lodash';


export async function invoiceNinjaApiDownloadFile(
	this: IExecuteFunctions, 
	method: string,
	endpoint: string,
	) {
	const credentials = await this.getCredentials('invoiceNinjaApi');
	
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}
	
	const version = this.getNodeParameter('apiVersion', 0) as string;
	
	const defaultUrl = version === 'v4' ? 'https://app.invoiceninja.com' : 'https://invoicing.co';
	const baseUrl = credentials.url || defaultUrl;
	
	return this.helpers.request({
		uri: `${baseUrl}/api/v1${endpoint}`,
		method,
		json: false,
		encoding: null,
		headers: {
			'X-API-Token': credentials.apiToken,
			'Accept': 'application/pdf'
		},
	});
}

export async function invoiceNinjaApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	query?: IDataObject,
	uri?: string,
) {
	const credentials = await this.getCredentials('invoiceNinjaApi');

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const version = this.getNodeParameter('apiVersion', 0) as string;

	const defaultUrl = version === 'v4' ? 'https://app.invoiceninja.com' : 'https://invoicing.co';
	const baseUrl = credentials.url || defaultUrl;

	// CREATE / UPDATE - Parameter: jsonBody - for more parameters to send via the api
	let jsonBody;
	try { 
		jsonBody = this.getNodeParameter('jsonBody', 0) as object || {};
	} catch(err) {

	}
	if (jsonBody) try {
		if (typeof jsonBody == 'string') jsonBody = JSON.parse(jsonBody);
		if (Array.isArray(jsonBody) || typeof jsonBody != 'object') throw new Error('Invalid Input');
		body = {
			...body,
			...jsonBody,
		}
	} catch(err) {
		throw new Error('Could not parse Parameter: jsonBody')
	}
	

	const options: OptionsWithUri = {
		method,
		qs: query,
		uri: uri || `${baseUrl}/api/v1${endpoint}`,
		body,
		json: true,
	};

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'invoiceNinjaApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function invoiceNinjaApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {
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
	} while (responseData.meta?.pagination?.links?.next);

	return returnData;
}
