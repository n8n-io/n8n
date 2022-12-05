import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, JsonObject, NodeApiError, NodeOperationError } from 'n8n-workflow';

import { get } from 'lodash';

export const eventID: { [key: string]: string } = {
	create_client: '1',
	update_client: '10',
	delete_client: '11',

	create_vendor: '5',
	update_vendor: '13',
	delete_vendor: '14',

	create_invoice: '2',
	update_invoice: '8',
	delay_invoice: '22',
	remind_invoice: '24',
	delete_invoice: '9',

	create_quote: '3',
	update_quote: '6',
	accept_quote: '21',
	expire_quote: '23',
	delete_quote: '7',

	create_payment: '4',
	delete_payment: '12',

	create_expense: '15',
	update_expense: '16',
	delete_expense: '17',

	create_project: '25',
	update_project: '26',
	delete_project: '30',

	create_task: '18',
	update_task: '19',
	delete_task: '20',
};

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
