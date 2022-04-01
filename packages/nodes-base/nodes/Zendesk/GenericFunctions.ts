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

export async function zendeskApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	let options: OptionsWithUri = {
		headers: {},
		method,
		qs,
		body,
		//@ts-ignore
		uri,
		json: true,
		qsStringifyOptions: {
			arrayFormat: 'brackets',
		},
	};

	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		if (authenticationMethod === 'apiToken') {
			const credentials = await this.getCredentials('zendeskApi');

			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}

			const base64Key =  Buffer.from(`${credentials.email}/token:${credentials.apiToken}`).toString('base64');
			options.uri = uri || `https://${credentials.subdomain}.zendesk.com/api/v2${resource}.json`;
			options.headers!['Authorization'] = `Basic ${base64Key}`;
			return await this.helpers.request!(options);
		} else {
			const credentials = await this.getCredentials('zendeskOAuth2Api');

			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}

			options.uri = uri || `https://${credentials.subdomain}.zendesk.com/api/v2${resource}.json`;

			return await this.helpers.requestOAuth2!.call(this, 'zendeskOAuth2Api', options);
		}
	} catch(error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function zendeskApiRequestAllItems(this: IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions, propertyName: string, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	let uri: string | undefined;

	do {
		responseData = await zendeskApiRequest.call(this, method, resource, body, query, uri);
		uri = responseData.next_page;
		returnData.push.apply(returnData, responseData[propertyName]);
		if (query.limit && query.limit <= returnData.length) {
			return returnData;
		}
	} while (
		responseData.next_page !== undefined &&
		responseData.next_page !== null
	);

	return returnData;
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
